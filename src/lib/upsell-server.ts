import projet from "@/config/projet.json";
import type { UpsellEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { formatLocalPrice, localPriceFor, type LocalPriceRule } from "@/lib/local-price";
import { formatBudgetRange, getUpsellPlans, levelsLabel } from "@/lib/plans";
import { projectAnchorPrice } from "@/lib/project-anchor";
import {
  PROMO_GUIDE_IMAGE,
  PROMO_GUIDE_PATH,
  UPSELL,
  UPSELL_CATALOGUE_PATH,
  formatDeadline,
  upsellDeadline,
  upsellPath,
  upsellPrice,
} from "@/lib/upsell";

const RULES = ((projet as { localPrices?: LocalPriceRule[] }).localPrices ?? []) as LocalPriceRule[];

/** Prix avec et sans code, dans la monnaie du client (« 4 900 FCFA », « ≈ 5 050 FCFA »). */
export function upsellPrices(country: string | null | undefined) {
  const local = localPriceFor(country, { price: projet.price, anchor: projectAnchorPrice() }, RULES);
  const promo = upsellPrice(local);
  return {
    price: `${promo.approx ? "≈ " : ""}${formatLocalPrice(promo.amount, promo.currency)}`,
    fullPrice: formatLocalPrice(local.amount, local.currency),
  };
}

const absolute = (path: string) => (path.startsWith("http") ? path : siteUrl(path));

/** Bloc de l'offre aux clients pour l'email de livraison (null si aucun autre modèle n'est proposé). */
export async function buildUpsellEmail(params: { planSlug: string; paidAt: Date; country?: string | null }): Promise<UpsellEmail | null> {
  const plans = await getUpsellPlans(params.planSlug, 3).catch(() => []);
  if (plans.length === 0) return null;
  return {
    code: UPSELL.code,
    ...upsellPrices(params.country),
    deadline: formatDeadline(upsellDeadline(params.paidAt)),
    catalogueUrl: siteUrl(UPSELL_CATALOGUE_PATH),
    guideUrl: siteUrl(PROMO_GUIDE_PATH),
    guideImage: siteUrl(PROMO_GUIDE_IMAGE),
    plans: plans.map((p) => ({
      name: p.name,
      url: siteUrl(`/catalogue/${p.slug}`),
      buyUrl: siteUrl(upsellPath(p.slug)),
      image: p.coverImage ? absolute(p.coverImage) : null,
      details: `${p.bedrooms} chambres · ${p.surfaceTotal} m² · ${p.levels <= 1 ? "plain-pied" : levelsLabel(p.levels)}`,
      budget: formatBudgetRange(p.budgetMin, p.budgetMax),
    })),
  };
}
