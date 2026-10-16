import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { DAY_MS, MONTH_MS, evaluatePdfQuota, quotaLimits } from "@/lib/pdf-quota-rules";
import { rateLimit } from "@/lib/rate-limit";

/** Quota de fiches PDF d'un membre (voir pdf-quota-rules). `slug` = fiche demandée, ou null pour l'affichage. */
export async function getPdfQuota(memberId: string, slug: string | null = null) {
  const rows = await getDb()
    .select({ planSlug: schema.pdfDownloads.planSlug, createdAt: schema.pdfDownloads.createdAt })
    .from(schema.pdfDownloads)
    .where(eq(schema.pdfDownloads.memberId, memberId))
    .orderBy(desc(schema.pdfDownloads.createdAt))
    .limit(2000);
  const limits = quotaLimits(getEnv() as unknown as Record<string, string | undefined>);
  return { ...evaluatePdfQuota(rows, slug, limits), limits };
}

export async function recordPdfDownload(input: { memberId: string; planSlug: string; planCode: string; markId: string; ip?: string | null; country?: string | null }) {
  await getDb()
    .insert(schema.pdfDownloads)
    .values({ id: randomId(), ...input, ip: input.ip ?? null, country: input.country ?? null });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Prévient l'administrateur (une fois par mois et par membre) d'un quota atteint : comportement à surveiller. */
export async function alertQuotaReached(member: { id: string; email: string; name?: string | null }, reason: string, ownedCodes: number) {
  const to = getEnv().ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  if (!(await rateLimit(`pdf-quota-alert:${reason === "lifetime" ? "lifetime" : "quota"}:${member.id}`, 1, reason === "lifetime" ? 3650 * DAY_MS : MONTH_MS))) return;
  const who = member.name ? `${member.name} (${member.email})` : member.email;
  const what =
    reason === "lifetime"
      ? "le plafond définitif"
      : reason === "burst"
        ? "un nombre anormal de téléchargements en 24 h"
        : reason === "day"
          ? "le quota journalier"
          : "le quota mensuel";
  const text = `${who} a atteint ${what} de fiches PDF (${ownedCodes} modèles différents téléchargés au total).\n\nSi ce rythme vous semble suspect (aspiration du catalogue), vous pouvez consulter ses téléchargements ou révoquer son accès depuis l'admin : ${siteUrl("/admin")}`;
  await sendEmail({
    to,
    subject: `Fiches PDF : quota atteint par ${member.email}`,
    text,
    html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
    template: "admin_pdf_quota",
    memberId: member.id,
  });
}
