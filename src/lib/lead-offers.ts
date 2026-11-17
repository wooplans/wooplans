/**
 * Offres d'entrée à 1 900 FCFA (lead magnets payants) : le Guide WooPlans des maisons et l'Extrait du Catalogue
 * Premium (5 maisons complètes, test lancé le 17 nov. 2026). Même paiement, même livraison par lien personnel,
 * même suite (séquence WhatsApp, pipeline) ; textes, PDF et produit Chariow propres à chacune.
 */
import extrait from "@/config/extrait.json";
import { GUIDE, GUIDE_CTA_ID, GUIDE_PATH } from "@/lib/guide";

export type LeadOfferKey = "guide" | "extrait";

export type LeadOffer = {
  key: LeadOfferKey;
  ctaId: string;
  path: string;
  productId: string;
  price: number;
  pdfKey: string;
  pdfFileName: string;
  /** Nom du produit (ventes, emails). */
  name: string;
  /** « votre guide », « votre extrait » : dans les textes. */
  noun: string;
};

export const EXTRAIT_PATH = "/extrait-catalogue-premium";

export const LEAD_OFFERS: Record<LeadOfferKey, LeadOffer> = {
  guide: {
    key: "guide",
    ctaId: GUIDE_CTA_ID,
    path: GUIDE_PATH,
    productId: GUIDE.chariowProductId.trim(),
    price: GUIDE.price,
    pdfKey: GUIDE.pdfKey,
    pdfFileName: GUIDE.pdfFileName,
    name: "Guide WooPlans des maisons",
    noun: "guide",
  },
  extrait: {
    key: "extrait",
    ctaId: "extrait",
    path: EXTRAIT_PATH,
    productId: extrait.chariowProductId.trim(),
    price: extrait.price,
    pdfKey: extrait.pdfKey,
    pdfFileName: extrait.pdfFileName,
    name: "Extrait du Catalogue Premium",
    noun: "extrait",
  },
};

export const EXTRAIT_MODELS = extrait.models;
/** Les 5 maisons de l'extrait (même ordre que le PDF). */
export const EXTRAIT_SLUGS: string[] = extrait.slugs;
export const LEAD_CTA_IDS = Object.values(LEAD_OFFERS).map((o) => o.ctaId);

export function leadOfferByCta(ctaId: string | null | undefined): LeadOffer | null {
  return Object.values(LEAD_OFFERS).find((o) => o.ctaId === ctaId) ?? null;
}

export function leadOfferByProduct(productId: string | null | undefined): LeadOffer | null {
  if (!productId) return null;
  return Object.values(LEAD_OFFERS).find((o) => o.productId && o.productId === productId) ?? null;
}

/** Produits des offres d'entrée : jamais comptés comme un achat du catalogue. */
export function leadProductIds() {
  return Object.values(LEAD_OFFERS).map((o) => o.productId).filter(Boolean);
}
