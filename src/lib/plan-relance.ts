import { and, asc, eq, gte, isNotNull, lte, ne, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { planDevisRelanceEmail, sendEmail } from "@/lib/email";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { getEnv, siteUrl } from "@/lib/env";
import { projectStartPrice } from "@/lib/custom-plans";
import { formatFcfa } from "@/lib/plans";
import { PLAN_RELANCE_COOLDOWN_DAYS, PLAN_RELANCE_DELAYS_HOURS, firstRelanceAt, nextRelanceAt } from "@/lib/plan-relance-schedule";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/site";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Relance du plan et devis abandonné ou échoué (produit en test face au Catalogue Premium).
 * Pour l'arrêter : réglage « plan_relance » = { "enabled": false }, ou retirer l'appel dans le cron.
 */
async function relanceEnabled() {
  const s = await getSetting<{ enabled?: boolean }>("plan_relance", { enabled: true });
  return s.enabled !== false;
}

/** Programme le premier email après un abandon / échec (appelé par la notification Chariow). */
export async function schedulePlanRelance(intentId: string, email: string, abandonedAt: Date) {
  if (!(await relanceEnabled())) return false;
  const db = getDb();
  const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) });
  if (!intent?.planSlug || intent.status === "paid" || intent.relanceStep > 0 || intent.relanceNextAt) return false;

  // Une seule relance par personne et par semaine, même après plusieurs tentatives ou plusieurs modèles.
  const since = new Date(abandonedAt.getTime() - PLAN_RELANCE_COOLDOWN_DAYS * 24 * 3_600_000);
  const recent = await db.query.checkoutIntents.findFirst({
    where: and(
      eq(schema.checkoutIntents.email, email),
      isNotNull(schema.checkoutIntents.planSlug),
      ne(schema.checkoutIntents.id, intent.id),
      or(isNotNull(schema.checkoutIntents.relanceNextAt), gte(schema.checkoutIntents.relanceStep, 1)),
      gte(schema.checkoutIntents.updatedAt, since),
    ),
    columns: { id: true },
  });
  if (recent) return false;

  await db
    .update(schema.checkoutIntents)
    .set({ email: intent.email ?? email, relanceNextAt: firstRelanceAt(abandonedAt), updatedAt: new Date() })
    .where(eq(schema.checkoutIntents.id, intent.id));
  return true;
}

/** Passage du cron (toutes les 15 min) : envoie les emails dus de la relance du plan et devis. */
export async function runPlanRelance(now = new Date()) {
  const result = { sent: 0, failed: 0, stopped: 0 };
  if (!(await relanceEnabled())) return result;
  const allowance = await automatedEmailAllowance(now);
  if (allowance <= 0) return result;
  const db = getDb();
  const due = await db.query.checkoutIntents.findMany({
    where: and(isNotNull(schema.checkoutIntents.planSlug), isNotNull(schema.checkoutIntents.relanceNextAt), lte(schema.checkoutIntents.relanceNextAt, now)),
    orderBy: asc(schema.checkoutIntents.relanceNextAt),
    limit: Math.min(25, allowance),
  });
  if (due.length === 0) return result;

  const optedOut = await optedOutEmails(due.map((i) => i.email).filter((e): e is string => Boolean(e)), "prospects");
  const stop = (id: string) =>
    db.update(schema.checkoutIntents).set({ relanceNextAt: null, updatedAt: now }).where(eq(schema.checkoutIntents.id, id));

  for (const intent of due) {
    const email = intent.email;
    const plan = intent.planSlug ? await db.query.plans.findFirst({ where: eq(schema.plans.slug, intent.planSlug) }) : null;
    // Déjà payé (cette tentative ou une autre pour le même modèle), désinscrit, modèle retiré : fin de la relance.
    const paid =
      intent.status === "paid" ||
      (email &&
        (await db.query.checkoutIntents.findFirst({
          where: and(eq(schema.checkoutIntents.email, email), eq(schema.checkoutIntents.planSlug, intent.planSlug!), eq(schema.checkoutIntents.status, "paid")),
          columns: { id: true },
        })));
    if (!email || paid || optedOut.has(email) || !plan || plan.status !== "published") {
      await stop(intent.id);
      result.stopped++;
      continue;
    }

    const claimed = await db
      .update(schema.checkoutIntents)
      .set({ relanceNextAt: null, updatedAt: now })
      .where(and(eq(schema.checkoutIntents.id, intent.id), eq(schema.checkoutIntents.relanceNextAt, intent.relanceNextAt!)))
      .returning({ id: schema.checkoutIntents.id });
    if (claimed.length === 0) continue;

    const step = intent.relanceStep;
    const sale = intent.saleId ? await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, intent.saleId), columns: { name: true } }) : null;
    const mail = planDevisRelanceEmail({
      step,
      name: sale?.name,
      lastEvent: intent.status === "failed" ? "failed" : "abandoned",
      planName: plan.name,
      planCode: plan.code,
      planUrl: siteUrl(`/catalogue/${plan.slug}?utm_source=email&utm_medium=relance&utm_campaign=plan_devis_${step + 1}`),
      whatsappUrl: whatsappLink(
        `Bonjour WOOPLANS, j'ai une question sur le plan et devis du modèle ${plan.code}.`,
        getEnv().WHATSAPP_NUMBER || undefined,
      ),
      price: formatFcfa(projectStartPrice()),
      unsubscribe: await unsubscribeUrl(email, "prospects"),
    });
    const sent = await sendEmail({ to: email, ...mail, template: `plan_devis_relance_${step + 1}`, headers: await unsubscribeHeaders(email, "prospects") });

    if (sent.ok) {
      await db
        .update(schema.checkoutIntents)
        .set({ relanceStep: step + 1, relanceNextAt: nextRelanceAt(intent.relanceNextAt!, step, now, PLAN_RELANCE_DELAYS_HOURS), updatedAt: now })
        .where(eq(schema.checkoutIntents.id, intent.id));
      result.sent++;
    } else {
      await db
        .update(schema.checkoutIntents)
        .set({ relanceNextAt: new Date(now.getTime() + 3_600_000), updatedAt: now })
        .where(eq(schema.checkoutIntents.id, intent.id));
      result.failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 400)); // Limite de débit de Resend.
  }
  return result;
}
