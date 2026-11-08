/**
 * Prix d'ancrage barré du plan et devis (src/config/projet.json, « anchorPrice »), affiché à côté du prix
 * actuel. Masqué s'il est absent ou s'il n'est pas supérieur au prix (aucun prix barré incohérent).
 * Module sans dépendance (testé par node --test) ; projectAnchorPrice est dans project-anchor.ts.
 */
export function anchorPriceFor(price: number, anchor: unknown): number | null {
  return typeof anchor === "number" && Number.isFinite(anchor) && anchor > price ? anchor : null;
}

/** « 50 000 » (espace insécable fine), sans la devise. */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)).replace(/ | /g, " ");
}
