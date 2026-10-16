import { getCurrentMember } from "@/lib/auth";
import { getEnv, runInBackground, siteUrl } from "@/lib/env";
import { alertQuotaReached, getPdfQuota, recordPdfDownload } from "@/lib/pdf-quota";
import { buildPlanPdf, fileName } from "@/lib/plan-pdf";
import { burnWatermark, loadLogo, loadPdfFloorPlan, loadPdfImage, type RasterMark } from "@/lib/plan-pdf-assets";
import { getPremiumPlan } from "@/lib/plans";
import { clientIp } from "@/lib/rate-limit";
import { watermarkForMember } from "@/lib/watermark";

const MAX_RENDERS = 6;

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

  const env = getEnv();
  const mark = watermarkForMember(member, plan.code, new Date(), env.SITE_URL);
  const raster: RasterMark = { id: mark.id, lines: mark.rasterLines };
  const renderRefs = [...new Set([plan.coverImage, ...plan.renders].filter(Boolean))].slice(0, MAX_RENDERS + 1);
  const photo = async (ref: string, width?: number) => {
    const image = await loadPdfImage(ref, width);
    return image ? burnWatermark(image, raster, "photo", `${ref}@${width ?? "d"}`) : null;
  };
  const [logo, cover, floorPlans, renders] = await Promise.all([
    loadLogo(),
    renderRefs[0] ? photo(renderRefs[0], 1600) : null,
    Promise.all(
      plan.floorPlans.map(async (ref) => {
        const asset = await loadPdfFloorPlan(ref);
        return asset ? burnWatermark(asset, raster, "plan", `${ref}@fp`) : null;
      }),
    ),
    Promise.all(renderRefs.slice(1).map((ref) => photo(ref))),
  ]);

  const bytes = await buildPlanPdf({
    plan,
    cover,
    renders: renders.filter((r) => r !== null),
    floorPlans: floorPlans.filter((f) => f !== null),
    logo,
    footer: mark.footer,
    watermarkLines: [mark.label, mark.brand],
    licensee: { name: member.name?.trim() ? `${member.name.trim()} (${member.email})` : member.email, id: mark.id },
    siteUrl: env.SITE_URL,
    sourceUrl: siteUrl(`/catalogue/${plan.slug}`),
  });

  await recordPdfDownload({
    memberId: member.id,
    planSlug: plan.slug,
    planCode: plan.code,
    markId: mark.id,
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
