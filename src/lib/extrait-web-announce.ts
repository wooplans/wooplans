import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { extraitWebAnnounceEmail, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { EXTRAIT_MODELS, LEAD_OFFERS } from "@/lib/lead-offers";
import { countPublishedPlans } from "@/lib/plans";
import { inChunks } from "@/lib/sql-chunks";
import { customerLookup } from "@/lib/prospects";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

export const ANNOUNCE_TEMPLATE = "extrait_web_annonce";

/**
 * Acheteurs de l'extrait à prévenir de l'extrait en ligne (une seule fois) : achat payé, pas encore client du
 * catalogue, pas désinscrits, email d'annonce jamais envoyé. Le plus récent achat d'abord.
 */
export async function extraitAnnounceQueue() {
  const db = getDb();
  const [intents, sent, isClient] = await Promise.all([
    db.query.checkoutIntents.findMany({
      where: and(eq(schema.checkoutIntents.ctaId, LEAD_OFFERS.extrait.ctaId), eq(schema.checkoutIntents.status, "paid")),
      orderBy: [desc(schema.checkoutIntents.createdAt)],
      columns: { id: true, email: true },
      limit: 1000,
    }),
    db.query.emailLog.findMany({ where: and(eq(schema.emailLog.template, ANNOUNCE_TEMPLATE), eq(schema.emailLog.status, "sent")), columns: { to: true } }),
    customerLookup(),
  ]);
  const done = new Set(sent.map((s) => s.to));
  const seen = new Set<string>();
  const list: { intentId: string; email: string }[] = [];
  for (const i of intents) {
    if (!i.email || seen.has(i.email) || done.has(i.email) || isClient(i.email, null)) continue;
    seen.add(i.email);
    list.push({ intentId: i.id, email: i.email });
  }
  // D1 : au plus 100 paramètres par requête, d'où les lots.
  const optedOut = new Set(await inChunks(list.map((l) => l.email), async (chunk) => [...(await optedOutEmails(chunk, "prospects"))], 80));
  return list.filter((l) => !optedOut.has(l.email));
}

/** Envoi (bouton de l'admin, après accord de Tao), dans la limite du budget d'emails du jour. */
export async function sendExtraitAnnounce(max: number) {
  const queue = await extraitAnnounceQueue();
  const allowance = await automatedEmailAllowance();
  const batch = queue.slice(0, Math.max(0, Math.min(max, allowance, 80)));
  if (batch.length === 0) return { sent: 0, failed: 0, remaining: queue.length, allowance };
  const db = getDb();
  const prospects = await db.query.prospects.findMany({
    where: inArray(schema.prospects.email, batch.map((b) => b.email)),
    columns: { email: true, name: true },
  });
  const names = new Map(prospects.map((p) => [p.email, p.name]));
  const total = (await countPublishedPlans()) ?? 100;
  let sent = 0;
  let failed = 0;
  for (const b of batch) {
    const mail = extraitWebAnnounceEmail({
      name: names.get(b.email),
      webUrl: siteUrl(`/mon-extrait/${b.intentId}`),
      models: EXTRAIT_MODELS,
      total,
      unsubscribe: await unsubscribeUrl(b.email, "prospects"),
    });
    const result = await sendEmail({ to: b.email, ...mail, template: ANNOUNCE_TEMPLATE, headers: await unsubscribeHeaders(b.email, "prospects") });
    if (result.ok) sent++;
    else failed++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { sent, failed, remaining: queue.length - sent, allowance };
}
