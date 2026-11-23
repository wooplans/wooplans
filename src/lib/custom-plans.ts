import type { PlanCategory } from "@/lib/plan-format";
import projet from "@/config/projet.json";

/**
 * Prix fixes des plans complets personnalisés (décision de Tao du 23 nov. 2026) : 239 000 FCFA pour une villa,
 * 339 000 FCFA pour un duplex. La prestation se fait en 2 étapes : 1) le Catalogue Premium, inclus dans ce prix
 * (son prix est déduit du solde) ; 2) la personnalisation du modèle choisi. Le plan et devis n'est pas déduit.
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
    price: 239000,
    description: "Adaptation d'un modèle du catalogue à votre terrain et à vos besoins.",
    deliverables: COMPLETE_PLAN_DELIVERABLES,
  },
  {
    category: "duplex",
    title: "Duplex (R+1)",
    price: 339000,
    description: "Adaptation d'un duplex du catalogue, niveaux et escalier compris.",
    deliverables: COMPLETE_PLAN_DELIVERABLES,
  },
] as const;

export type CustomPlanOffer = (typeof CUSTOM_PLAN_OFFERS)[number];

export function customPlanOffer(category: PlanCategory): CustomPlanOffer | undefined {
  return CUSTOM_PLAN_OFFERS.find((o) => o.category === category);
}

/**
 * Plan et devis d'un modèle à télécharger (1re étape) : distribution cotée, devis détaillé et échange
 * avec nos architectes. Prix lu dans src/config/projet.json (non déduit des plans complets).
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
