import type { PlanCategory } from "@/lib/plan-format";
import projet from "@/config/projet.json";

/**
 * Prix des plans complets personnalisés (décision de Tao du 25 nov. 2026, remplace celle du 8 nov.) : 200 000 FCFA
 * pour une villa, 300 000 FCFA pour un duplex. Avance de 39 000 FCFA à la commande, déduite du prix ; elle ouvre
 * l'accès au Catalogue Premium. Livraison en 7 jours ouvrables. Remise de 50 000 FCFA au plus, négociée par Tao
 * (jamais affichée). Immeuble : prix négocié avec Tao sur WhatsApp.
 */
export const CUSTOM_PLAN_DEPOSIT = 39_000;
export const CUSTOM_PLAN_DELIVERY = "7 jours ouvrables";
/** Paiement des proformas (Orange Money). */
export const CUSTOM_PLAN_PAYMENT = { method: "Orange Money", number: "656 71 35 03", holder: "Tawokam Romuald" } as const;

/** Les 10 plans livrés, pour une villa comme pour un duplex (repris dans la FAQ de la page de vente). */
const COMPLETE_PLAN_DELIVERABLES = [
  "Plans de fondation",
  "Plans de distribution",
  "Façades avant, arrière, gauche et droite",
  "Coupes AA et BB",
  "Plan de toiture",
  "Plan de fosse septique",
  "Devis de construction du gros œuvre",
] as const;

export const CUSTOM_PLAN_OFFERS = [
  {
    category: "villa",
    title: "Villa (plain-pied)",
    price: 200000,
    description: "Adaptation d'un modèle du catalogue à votre terrain et à vos besoins.",
    deliverables: COMPLETE_PLAN_DELIVERABLES,
  },
  {
    category: "duplex",
    title: "Duplex (R+1)",
    price: 300000,
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
