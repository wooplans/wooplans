import { getCurrentMember } from "@/lib/auth";
import { runInBackground } from "@/lib/env";
import { alertQuotaReached, getPdfQuota, recordPdfDownload } from "@/lib/pdf-quota";
import { fileName } from "@/lib/plan-pdf";
import { renderPlanPdf } from "@/lib/plan-pdf-render";
import { getPremiumPlan } from "@/lib/plans";
import { clientIp } from "@/lib/rate-limit";

/**
 * Fiche PDF d'un modèle, assemblée à la demande depuis la fiche publiée
 * (toujours à jour), filigranée au nom du membre connecté (pages et pixels des images),
 * dans la limite du quota de téléchargement.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response("Accès réservé aux membres Premium", { status: 401 });
  const plan = await getPremiumPlan((await params).slug);
  if (!plan) return new Response("Modèle introuvable", { status: 404 });

  const quota = await getPdfQuota(member.id, plan.slug);
  if (!quota.allowed) {
    runInBackground(alertQuotaReached(member, quota.reason ?? "month", quota.ownedSlugs.length));
    const to = new URL("/espace-premium/telechargements", request.url);
    to.searchParams.set("quota", quota.reason ?? "month");
    if (quota.retryAt) to.searchParams.set("le", String(quota.retryAt.getTime()));
    return Response.redirect(to, 303);
  }

  const { bytes, markId } = await renderPlanPdf(plan, member);

  await recordPdfDownload({
    memberId: member.id,
    planSlug: plan.slug,
    planCode: plan.code,
    markId,
    ip: clientIp(request.headers),
    country: request.headers.get("cf-ipcountry"),
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(plan.code)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
