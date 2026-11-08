import { customPlanOffer } from "@/lib/custom-plans";
import { CUSTOMIZATION_STEPS, DELIVERABLES } from "@/lib/deliverables";
import { getEnv, siteUrl } from "@/lib/env";
import type { PlanCategory } from "@/lib/plan-format";
import { buildPlanPdf, type CompletePlansOffer } from "@/lib/plan-pdf";
import { burnWatermark, loadLogo, loadPdfFloorPlan, loadPdfImage, type RasterMark } from "@/lib/plan-pdf-assets";
import type { getPremiumPlan } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { watermarkForMember } from "@/lib/watermark";

const MAX_RENDERS = 6;

type Plan = NonNullable<Awaited<ReturnType<typeof getPremiumPlan>>>;

/** Numéro WhatsApp lisible : 237653769998 → « +237 6 53 76 99 98 ». */
export function displayPhone(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length === 12) return `+237 ${digits[3]} ${digits.slice(4).match(/../g)!.join(" ")}`;
  return `+${digits}`;
}

/**
 * Offre des plans complets imprimée dans le PDF (villa ou duplex, prix fixe sans déduction), avec un
 * message WhatsApp et un email préremplis au code du modèle. Aucune offre pour les autres catégories.
 */
export function completePlansOffer(plan: { code: string; name: string; slug: string; category: PlanCategory }): CompletePlansOffer | null {
  const offer = customPlanOffer(plan.category);
  if (!offer) return null;
  const number = (getEnv().WHATSAPP_NUMBER || "237653769998").replace(/\D/g, "");
  const message = `Bonjour WOOPLANS, j'ai le plan et devis du modèle ${plan.code} (${plan.name}). Je souhaite les plans complets adaptés à mon terrain.`;
  const subject = `Plans complets du modèle ${plan.code}`;
  const body = `${message}\n\nMon terrain (dimensions, ville) :\nMes modifications souhaitées :\nMon numéro WhatsApp :`;
  return {
    title: offer.title,
    price: offer.price,
    deliverables: DELIVERABLES,
    steps: CUSTOMIZATION_STEPS,
    whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    whatsappLabel: displayPhone(number),
    email: SITE.email,
    emailUrl: `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    pageUrl: siteUrl(`/plans-personnalises?modele=${encodeURIComponent(plan.code)}`),
  };
}

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
    completePlans: completePlansOffer(plan),
  });
  return { bytes, markId: mark.id };
}
