import { and, eq, gte, isNotNull, lt, lte, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { timingSafeEqual } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { formatFcfa } from "@/lib/plans";

/**
 * Tâche quotidienne (déclenchée par le cron du Worker, voir worker.ts) :
 * nettoyage des codes affichés sur /merci et récapitulatif envoyé à l'admin
 * (ventes de la veille, paniers abandonnés à relancer, relances CRM du jour).
 */
export async function POST(request: Request) {
  const env = getEnv();
  const secret = request.headers.get("x-cron-secret") || "";
  if (!env.CRON_SECRET || !timingSafeEqual(secret, env.CRON_SECRET)) return new Response("Non autorisé", { status: 401 });

  const db = getDb();
  const now = new Date();
  await db
    .update(schema.checkoutIntents)
    .set({ revealCode: null })
    .where(and(isNotNull(schema.checkoutIntents.revealCode), lt(schema.checkoutIntents.revealUntil, now)));
  await db.delete(schema.rateLimits).where(lt(schema.rateLimits.windowStart, new Date(now.getTime() - 86400_000)));

  const since = new Date(now.getTime() - 86400_000);
  const [sales, abandoned, due] = await Promise.all([
    db.query.sales.findMany({ where: and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, since)) }),
    db.query.sales.findMany({ where: and(eq(schema.sales.status, "abandoned"), gte(schema.sales.occurredAt, since)) }),
    db.query.leads.findMany({
      where: and(lte(schema.leads.nextFollowUpAt, new Date(now.getTime() + 12 * 3600_000)), notInArray(schema.leads.stage, ["termine", "perdu"])),
    }),
  ]);

  const to = env.ADMIN_NOTIFY_EMAIL;
  if (to && (sales.length || abandoned.length || due.length)) {
    const revenue = sales.reduce((s, x) => s + x.amount, 0);
    const li = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "<p>—</p>");
    const esc = (v: string | null) => (v || "").replace(/[<>&]/g, "");
    const html = `<h2>Récapitulatif WooPlans</h2>
<p><strong>${sales.length} vente(s)</strong> du catalogue sur 24 h : ${formatFcfa(revenue)}.</p>
<h3>Paniers abandonnés à relancer sur WhatsApp</h3>${li(abandoned.map((a) => `${esc(a.name) || "Client"} — ${esc(a.phone) || esc(a.email)}`))}
<h3>Relances CRM du jour</h3>${li(due.map((l) => `<a href="${siteUrl(`/admin/crm/${l.id}`)}">${esc(l.name)}</a> (${l.stage}) — ${esc(l.phone)}`))}
<p><a href="${siteUrl("/admin")}">Ouvrir le tableau de bord</a></p>`;
    await sendEmail({
      to,
      subject: `WooPlans : ${sales.length} vente(s), ${due.length} relance(s) aujourd'hui`,
      html,
      text: `${sales.length} vente(s) (${formatFcfa(revenue)}), ${abandoned.length} panier(s) abandonné(s), ${due.length} relance(s) CRM.`,
      template: "admin_digest",
    });
  }
  return Response.json({ ok: true, sales: sales.length, abandoned: abandoned.length, due: due.length });
}
