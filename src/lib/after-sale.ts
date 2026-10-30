import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { afterSaleEmail, sendEmail } from "@/lib/email";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { siteUrl } from "@/lib/env";
import { afterSaleNextAt } from "@/lib/after-sale-schedule";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Passage du cron (toutes les 15 min) : emails après l'achat du Catalogue Premium (avis en priorité,
 * puis rappels espacés). S'arrête dès que l'avis est marqué reçu dans l'admin, à la désinscription ou à la révocation.
 */
export async function runAfterSale(now = new Date()) {
  const result = { sent: 0, failed: 0, stopped: 0 };
  const allowance = await automatedEmailAllowance(now);
  if (allowance <= 0) return result;
  const db = getDb();
  const due = await db.query.members.findMany({
    where: and(isNotNull(schema.members.afterSaleNextAt), lte(schema.members.afterSaleNextAt, now)),
    orderBy: asc(schema.members.afterSaleNextAt),
    limit: Math.min(25, allowance),
  });
  if (due.length === 0) return result;
  const optedOut = await optedOutEmails(due.map((m) => m.email), "members");

  for (const m of due) {
    if (m.status !== "active" || m.testimonialReceivedAt || optedOut.has(m.email)) {
      await db.update(schema.members).set({ afterSaleNextAt: null, updatedAt: now }).where(eq(schema.members.id, m.id));
      result.stopped++;
      continue;
    }
    const claimed = await db
      .update(schema.members)
      .set({ afterSaleNextAt: null, updatedAt: now })
      .where(and(eq(schema.members.id, m.id), eq(schema.members.afterSaleNextAt, m.afterSaleNextAt!)))
      .returning({ id: schema.members.id });
    if (claimed.length === 0) continue;

    const step = m.afterSaleStep;
    const campaign = `apres_achat_${step + 1}`;
    const mail = afterSaleEmail({
      step,
      name: m.name || null,
      testimonialUrl: siteUrl(`/temoignage?utm_source=email&utm_medium=apres_achat&utm_campaign=${campaign}`),
      loginUrl: siteUrl(`/connexion?email=${encodeURIComponent(m.email)}&utm_source=email&utm_medium=apres_achat&utm_campaign=${campaign}`),
      customPlansUrl: siteUrl(`/plans-personnalises?utm_source=email&utm_medium=apres_achat&utm_campaign=${campaign}`),
      unsubscribe: await unsubscribeUrl(m.email, "members"),
    });
    const sent = await sendEmail({ to: m.email, ...mail, template: campaign, memberId: m.id, headers: await unsubscribeHeaders(m.email, "members") });

    if (sent.ok) {
      await db
        .update(schema.members)
        .set({
          afterSaleStep: step + 1,
          afterSaleNextAt: afterSaleNextAt(m.createdAt, step, now),
          // Visible dans l'admin Témoignages : date et nombre de demandes d'avis.
          testimonialAskedAt: now,
          testimonialAskCount: m.testimonialAskCount + 1,
          updatedAt: now,
        })
        .where(eq(schema.members.id, m.id));
      result.sent++;
    } else {
      await db
        .update(schema.members)
        .set({ afterSaleNextAt: new Date(now.getTime() + 3_600_000), updatedAt: now })
        .where(eq(schema.members.id, m.id));
      result.failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 400)); // Limite de débit de Resend.
  }
  return result;
}
