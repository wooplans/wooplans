import type { PlanCategory } from "@/lib/plan-format";
import projet from "@/config/projet.json";
import { cataloguePrice } from "@/lib/site";

/**
 * Prix fixes des plans complets personnalisés. Un membre Premium ne paie que la différence
 * avec le prix du catalogue déjà payé. Version simplifiée : un prix par type, en attendant des prix par standing.
 */
/** Les 10 plans livrés, pour une villa comme pour un duplex (repris dans la FAQ de la page de vente). */
const COMPLETE_PLAN_DELIVERABLES = [
  "Plans de fondation",
  "Plans de distribution",
  "Façades avant, arrière, gauche et droite",
  "Coupes AA et BB",
  "Plan de toiture",
  "Plan de fosse septique",
] as const;

export const CUSTOM_PLAN_OFFERS = [
  {
    category: "villa",
    title: "Villa (plain-pied)",
    price: 149000,
    description: "Adaptation d'un modèle du catalogue à votre terrain et à vos besoins.",
    deliverables: COMPLETE_PLAN_DELIVERABLES,
  },
  {
    category: "duplex",
    title: "Duplex (R+1)",
    price: 249000,
    description: "Adaptation d'un duplex du catalogue, niveaux et escalier compris.",
    deliverables: COMPLETE_PLAN_DELIVERABLES,
  },
] as const;

export type CustomPlanOffer = (typeof CUSTOM_PLAN_OFFERS)[number];

export function customPlanOffer(category: PlanCategory): CustomPlanOffer | undefined {
  return CUSTOM_PLAN_OFFERS.find((o) => o.category === category);
}

/** Ce qu'il reste à payer pour un membre Premium : le prix actuel du catalogue est déduit. */
export function memberBalance(offer: CustomPlanOffer) {
  return Math.max(0, offer.price - cataloguePrice());
}

/**
 * Plan et devis d'un modèle à télécharger (1re étape) : distribution cotée, devis détaillé et échange
 * avec nos architectes. Prix lu dans src/config/projet.json, déduit des plans complets du modèle choisi.
 */
export function projectStartPrice(): number {
  return projet.price;
}

/**
 * Plan et devis offert (aimant à contacts) : le formulaire de la fiche l'envoie gratuitement par email
 * au lieu de le vendre. Réglé dans src/config/projet.json (« gift ») ; false = retour à l'achat à 10 000 FCFA.
 */
export function planGiftEnabled(): boolean {
  return Boolean((projet as { gift?: boolean }).gift);
}

/** Ce qu'il reste à payer pour les plans complets après le plan et devis du modèle. */
export function projectBalance(offer: CustomPlanOffer) {
  return Math.max(0, offer.price - projectStartPrice());
}
