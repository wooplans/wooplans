import { and, eq, gte, isNotNull, like, lt, lte, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { timingSafeEqual } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { runMemberDigest } from "@/lib/member-mailing";
import { reconcileProspects } from "@/lib/prospects";
import { formatFcfa } from "@/lib/plans";

/**
 * Tâche quotidienne (déclenchée par le cron du Worker, voir worker.ts) :
 * nettoyage des codes affichés sur /merci et récapitulatif envoyé à l'admin
 * (ventes de la veille, paniers abandonnés à relancer, relances CRM du jour), et envoi par lots
 * des actualités mensuelles aux membres.
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

  await reconcileProspects().catch((error) => console.error("CRM prospects : rapprochement impossible", error));
  const digest = await runMemberDigest(now).catch((error) => {
    console.error("Actualités membres : échec", error);
    return null;
  });

  const since = new Date(now.getTime() - 86400_000);
  const [sales, abandoned, due, prospectEmails, legacyCodes] = await Promise.all([
    db.query.sales.findMany({ where: and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, since)) }),
    db.query.sales.findMany({ where: and(eq(schema.sales.status, "abandoned"), gte(schema.sales.occurredAt, since)) }),
    db.query.leads.findMany({
      where: and(lte(schema.leads.nextFollowUpAt, new Date(now.getTime() + 12 * 3600_000)), notInArray(schema.leads.stage, ["termine", "perdu"])),
    }),
    db.query.emailLog.findMany({
      where: and(like(schema.emailLog.template, "prospect_%"), eq(schema.emailLog.status, "sent"), gte(schema.emailLog.createdAt, since)),
      columns: { id: true },
    }),
    db.query.emailLog.findMany({
      where: and(like(schema.emailLog.template, "legacy_%"), eq(schema.emailLog.status, "sent"), gte(schema.emailLog.createdAt, since)),
      columns: { id: true },
    }),
  ]);

  const to = env.ADMIN_NOTIFY_EMAIL;
  if (to && (sales.length || abandoned.length || due.length)) {
    const revenue = sales.reduce((s, x) => s + x.amount, 0);
    const li = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "<p>—</p>");
    const esc = (v: string | null) => (v || "").replace(/[<>&]/g, "");
    const html = `<h2>Récapitulatif WOOPLANS</h2>
<p><strong>${sales.length} vente(s)</strong> du catalogue sur 24 h : ${formatFcfa(revenue)}.</p>
<h3>Paniers abandonnés (relancés automatiquement par email ; WhatsApp depuis l'onglet Prospects)</h3>${li(abandoned.map((a) => `${esc(a.name) || "Client"} — ${esc(a.phone) || esc(a.email)}`))}
<p>${prospectEmails.length} email(s) de relance envoyé(s) sur 24 h. <a href="${siteUrl("/admin/prospects")}">Voir les prospects</a></p>${
      legacyCodes.length ? `<p>Codes d'accès envoyés aux anciens abonnés sur 24 h : ${legacyCodes.length}. <a href="${siteUrl("/admin/membres")}">Voir la file</a></p>` : ""
    }${
      digest?.sent ? `<p>Actualités membres (${digest.campaign}) : ${digest.sent} email(s) envoyé(s), ${digest.remaining} restant(s).</p>` : ""
    }
<h3>Relances CRM du jour</h3>${li(due.map((l) => `<a href="${siteUrl(`/admin/crm/${l.id}`)}">${esc(l.name)}</a> (${l.stage}) — ${esc(l.phone)}`))}
<p><a href="${siteUrl("/admin")}">Ouvrir le tableau de bord</a></p>`;
    await sendEmail({
      to,
      subject: `WOOPLANS : ${sales.length} vente(s), ${due.length} relance(s) aujourd'hui`,
      html,
      text: `${sales.length} vente(s) (${formatFcfa(revenue)}), ${abandoned.length} panier(s) abandonné(s), ${due.length} relance(s) CRM.`,
      template: "admin_digest",
    });
  }
  return Response.json({ ok: true, sales: sales.length, abandoned: abandoned.length, due: due.length, digest });
}
