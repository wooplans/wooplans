import type { PlanCategory } from "@/lib/plan-format";
import { cataloguePrice } from "@/lib/site";

/**
 * Prix fixes des plans complets personnalisés. Un membre Premium ne paie que la différence
 * avec le prix du catalogue déjà payé. Version simplifiée : un prix par type, en attendant des prix par standing.
 */
export const CUSTOM_PLAN_OFFERS = [
  {
    category: "villa",
    title: "Villa (plain-pied)",
    price: 149000,
    description: "Adaptation d'un modèle du catalogue à votre terrain et à vos besoins.",
    deliverables: ["Plans architecturaux cotés", "Façades et coupes", "Plan de masse sur votre terrain", "Plans de fondation"],
  },
  {
    category: "duplex",
    title: "Duplex (R+1)",
    price: 249000,
    description: "Adaptation d'un duplex du catalogue, niveaux et escalier compris.",
    deliverables: ["Plans architecturaux de chaque niveau", "Façades et coupes", "Plan de masse", "Plans de fondation et de dalle"],
  },
] as const;

export type CustomPlanOffer = (typeof CUSTOM_PLAN_OFFERS)[number];

export function customPlanOffer(category: PlanCategory): CustomPlanOffer | undefined {
  return CUSTOM_PLAN_OFFERS.find((o) => o.category === category);
}

/** Ce qu'il reste à payer pour un membre Premium. */
export function memberBalance(offer: CustomPlanOffer) {
  return Math.max(0, offer.price - cataloguePrice());
}
