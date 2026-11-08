import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sendEmail, upsellCampaignEmail } from "@/lib/email";
import { isOwnerEmail } from "@/lib/owner-emails";
import { buildUpsellEmail } from "@/lib/upsell-server";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

/** Modèle d'email de l'envoi (journal des emails : sert aussi à ne jamais écrire deux fois au même client). */
export const UPSELL_CAMPAIGN_TEMPLATE = "upsell_clients";
/** Envois par clic : reste sous les limites de requêtes d'un Worker. */
export const UPSELL_CAMPAIGN_BATCH = 40;

type Recipient = { email: string; name: string | null; country: string | null; planSlug: string; planCode: string };

/**
 * Anciens acheteurs du plan et devis (paiements confirmés, plans offerts exclus), un par adresse
 * avec le dernier modèle acheté. Exclus : essais du propriétaire, désinscrits, déjà servis.
 */
export async function upsellCampaignRecipients(): Promise<{ pending: Recipient[]; alreadySent: number }> {
  const db = getDb();
  const intents = await db.query.checkoutIntents.findMany({
    where: and(eq(schema.checkoutIntents.status, "paid"), isNotNull(schema.checkoutIntents.planSlug), isNotNull(schema.checkoutIntents.email)),
    columns: { id: true, email: true, planSlug: true },
    orderBy: desc(schema.checkoutIntents.createdAt),
  });
  const latest = new Map<string, { id: string; planSlug: string }>();
  for (const i of intents) {
    const email = i.email!.trim().toLowerCase();
    if (!latest.has(email) && !isOwnerEmail(email)) latest.set(email, { id: i.id, planSlug: i.planSlug! });
  }
  const emails = [...latest.keys()];
  if (emails.length === 0) return { pending: [], alreadySent: 0 };

  const sent = await db.query.emailLog.findMany({
    where: and(eq(schema.emailLog.template, UPSELL_CAMPAIGN_TEMPLATE), eq(schema.emailLog.status, "sent")),
    columns: { to: true },
  });
  const sentSet = new Set(sent.map((r) => r.to.trim().toLowerCase()));
  const optedOut = await optedOutEmails(emails, "clients");

  const ids = [...latest.values()].map((v) => v.id);
  const sales = ids.length
    ? await db.query.sales.findMany({ where: inArray(schema.sales.intentId, ids), columns: { intentId: true, name: true, country: true } })
    : [];
  const saleByIntent = new Map(sales.map((s) => [s.intentId, s]));
  const slugs = [...new Set([...latest.values()].map((v) => v.planSlug))];
  const plans = await db.query.plans.findMany({ where: inArray(schema.plans.slug, slugs), columns: { slug: true, code: true } });
  const codeBySlug = new Map(plans.map((p) => [p.slug, p.code]));

  const pending: Recipient[] = [];
  let alreadySent = 0;
  for (const [email, v] of latest) {
    if (sentSet.has(email)) {
      alreadySent++;
      continue;
    }
    if (optedOut.has(email)) continue;
    const sale = saleByIntent.get(v.id);
    pending.push({ email, name: sale?.name ?? null, country: sale?.country ?? null, planSlug: v.planSlug, planCode: codeBySlug.get(v.planSlug) ?? v.planSlug });
  }
  return { pending, alreadySent };
}

/** Envoie l'offre (24 h à partir de l'envoi) au lot suivant d'anciens acheteurs. */
export async function sendUpsellCampaignBatch(limit = UPSELL_CAMPAIGN_BATCH) {
  const { pending } = await upsellCampaignRecipients();
  let sent = 0;
  let failed = 0;
  for (const r of pending.slice(0, limit)) {
    const upsell = await buildUpsellEmail({ planSlug: r.planSlug, paidAt: new Date(), country: r.country }).catch(() => null);
    if (!upsell) {
      failed++;
      continue;
    }
    const firstName = (r.name || "").trim().split(/\s+/)[0] || null;
    const mail = upsellCampaignEmail({ name: firstName, planCode: r.planCode, upsell, unsubscribe: await unsubscribeUrl(r.email, "clients") });
    const result = await sendEmail({ to: r.email, ...mail, template: UPSELL_CAMPAIGN_TEMPLATE, headers: await unsubscribeHeaders(r.email, "clients") });
    if (result.ok) sent++;
    else failed++;
  }
  return { sent, failed, remaining: Math.max(0, pending.length - sent) };
}
