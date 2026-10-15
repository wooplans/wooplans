import { getCurrentMember } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { buildPlanPdf, fileName } from "@/lib/plan-pdf";
import { loadLogo, loadPdfFloorPlan, loadPdfImage } from "@/lib/plan-pdf-assets";
import { getPremiumPlan } from "@/lib/plans";
import { drawWatermark, watermarkForMember } from "@/lib/watermark";

const MAX_RENDERS = 6;

/**
 * Fiche PDF d'un modèle, assemblée à la demande depuis la fiche publiée
 * (toujours à jour) et filigranée au nom du membre connecté.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response("Accès réservé aux membres Premium", { status: 401 });
  const plan = await getPremiumPlan((await params).slug);
  if (!plan) return new Response("Modèle introuvable", { status: 404 });

  const renderRefs = [...new Set([plan.coverImage, ...plan.renders].filter(Boolean))].slice(0, MAX_RENDERS + 1);
  const [logo, cover, floorPlans, renders] = await Promise.all([
    loadLogo(),
    renderRefs[0] ? loadPdfImage(renderRefs[0], 1600) : null,
    Promise.all(plan.floorPlans.map(loadPdfFloorPlan)),
    Promise.all(renderRefs.slice(1).map((ref) => loadPdfImage(ref))),
  ]);

  const mark = watermarkForMember(member, plan.code);
  const bytes = await buildPlanPdf({
    plan,
    cover,
    renders: renders.filter((r) => r !== null),
    floorPlans: floorPlans.filter((f) => f !== null),
    logo,
    footer: mark.footer,
    stamp: (page, font) => drawWatermark(page, mark, font),
    siteUrl: getEnv().SITE_URL,
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
