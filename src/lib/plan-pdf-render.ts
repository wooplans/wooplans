import { getEnv, siteUrl } from "@/lib/env";
import { buildPlanPdf } from "@/lib/plan-pdf";
import { burnWatermark, loadLogo, loadPdfFloorPlan, loadPdfImage, type RasterMark } from "@/lib/plan-pdf-assets";
import type { getPremiumPlan } from "@/lib/plans";
import { watermarkForMember } from "@/lib/watermark";

const MAX_RENDERS = 6;

type Plan = NonNullable<Awaited<ReturnType<typeof getPremiumPlan>>>;

/**
 * Fiche PDF d'un modèle, assemblée depuis la fiche publiée (toujours à jour) et filigranée au nom
 * du destinataire (pages et pixels des images). Utilisée par l'espace Premium (membre connecté)
 * et par l'achat du plan et devis d'un seul modèle (acheteur, identifié par son achat).
 */
export async function renderPlanPdf(plan: Plan, recipient: { id: string; email: string; name?: string | null }) {
  const env = getEnv();
  const mark = watermarkForMember(recipient, plan.code, new Date(), env.SITE_URL);
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
    licensee: { name: recipient.name?.trim() ? `${recipient.name.trim()} (${recipient.email})` : recipient.email, id: mark.id },
    siteUrl: env.SITE_URL,
    sourceUrl: siteUrl(`/catalogue/${plan.slug}`),
  });
  return { bytes, markId: mark.id };
}
