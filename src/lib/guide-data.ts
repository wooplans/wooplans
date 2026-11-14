/**
 * Guide d'entrée « Quelle maison construire avec votre budget ? » (1 900 FCFA) : constantes sans dépendance
 * (testables seules). Le paiement passe par le produit Chariow CHARIOW_GUIDE_PRODUCT_ID, via l'API de paiement
 * du site (comme le plan et devis) : intention, paiement, livraison par email et /merci, fiche CRM.
 */

/** Repère les achats du guide dans checkout_intents.cta_id. */
export const GUIDE_CTA_ID = "guide_budget";
export const GUIDE_PRICE = 1900;
export const GUIDE_TITLE = "Quelle maison construire avec votre budget ?";
export const GUIDE_PRODUCT_NAME = `Guide · ${GUIDE_TITLE}`;
/** PDF servi aux seuls acheteurs (/api/guide/<achat>) ; le nom de fichier public n'est jamais communiqué. */
export const GUIDE_PDF_ASSET = "/lp/guide-maison-budget-520563a29f24.pdf";
export const GUIDE_FILE_NAME = "guide-quelle-maison-construire-avec-votre-budget.pdf";
export const GUIDE_LEAD_NOTE = `Guide « ${GUIDE_TITLE} » payé (1 900 FCFA). À qualifier pour le Catalogue Premium : message WhatsApp à J+1.`;
/** Lien du catalogue depuis le guide : source repérée dans les statistiques. */
export const GUIDE_CATALOGUE_PATH = "/catalogue-premium?utm_source=guide_site&utm_medium=merci&utm_campaign=guide_budget&utm_content=merci";

export function isGuideIntent(intent: { ctaId?: string | null } | null | undefined): boolean {
  return intent?.ctaId === GUIDE_CTA_ID;
}

/** Lien personnel de téléchargement : l'identifiant de l'achat (aléatoire, 128 bits) est le secret. */
export function guideDownloadPath(intentId: string): string {
  return `/api/guide/${intentId}`;
}
