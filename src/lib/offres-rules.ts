/**
 * Offres « Plan et devis + Catalogue Premium offert » (src/config/offres.json), une par niveau de prix.
 *
 * Chaque offre est un produit Chariow à part (39 000, 29 000, 19 000 FCFA). L'acheteur paie ce produit, reçoit
 * l'accès à l'Espace Premium, et le modèle choisi sur la fiche l'y attend dans « Fiches PDF ».
 *
 * Choix de l'offre d'un visiteur, dans cet ordre :
 *  1. le lien de la pub : ?offre=29k (gardé dans le navigateur 30 jours) ;
 *  2. le pays du visiteur (liste « countries ») ;
 *  3. l'offre par défaut (« default »).
 * Une offre sans « chariowProductId » est inactive : le visiteur garde alors l'ancien plan et devis seul.
 *
 * Module sans dépendance (testé par node --test) ; la configuration est lue par src/lib/offres.ts.
 */
export type Offre = { id: string; price: number; anchor: number | null; chariowProductId: string; countries: string[] };
export type OffresConfig = { default: string; offres: Offre[] };

/** Paramètre d'URL des pubs (?offre=29k) et clé de mémorisation dans le navigateur. */
export const OFFRE_PARAM = "offre";
export const OFFRE_STORAGE_KEY = "wp_offre";

function normalizeId(id: string | null | undefined) {
  return (id || "").trim().toLowerCase().slice(0, 20);
}

export function offreById(id: string | null | undefined, cfg: OffresConfig): Offre | null {
  const key = normalizeId(id);
  return (key && cfg.offres.find((o) => o.id === key)) || null;
}

export function isActive(offre: Offre | null | undefined): offre is Offre {
  return Boolean(offre && offre.chariowProductId && offre.price > 0);
}

/**
 * Offre d'un visiteur : celle du lien de la pub si elle existe, sinon celle de son pays, sinon l'offre par défaut.
 * null si l'offre retenue n'est pas encore active (produit Chariow non renseigné) : ancien plan et devis seul.
 */
export function resolveOffre(requested: string | null | undefined, country: string | null | undefined, cfg: OffresConfig): Offre | null {
  const code = (country || "").toUpperCase();
  const chosen =
    offreById(requested, cfg) ?? (code ? cfg.offres.find((o) => o.countries.includes(code)) : undefined) ?? offreById(cfg.default, cfg);
  return isActive(chosen) ? chosen : null;
}

/** Produits Chariow des offres actives (ventes reconnues par la notification Chariow). */
export function offreProductIds(cfg: OffresConfig): Map<string, Offre> {
  return new Map(cfg.offres.filter(isActive).map((o) => [o.chariowProductId, o]));
}

/** Au moins une offre active : la fiche présente le bonus Catalogue Premium. */
export function offresEnabled(cfg: OffresConfig): boolean {
  return cfg.offres.some(isActive);
}
