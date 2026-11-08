/**
 * Versions réduites des images publiques (/media/…?w=…), fabriquées par Cloudflare Images et gardées
 * dans le cache Cloudflare (worker.ts met en cache chaque adresse /media, paramètre compris).
 *
 * Pourquoi : les rendus du site font 960 × 540 et environ 100 Ko. Une fiche en chargeait 8 en taille réelle
 * (galerie + vignettes) et 3 de plus pour les « modèles similaires » : plus de 900 Ko d'images avant que
 * le visiteur Facebook, souvent en 3G, ne voie la page. Une largeur adaptée à l'écran divise ce poids par 3 à 10.
 *
 * Seules quelques largeurs sont acceptées : une adresse au hasard ne peut pas faire fabriquer une infinité de versions.
 * Module sans dépendance pour pouvoir être testé isolément.
 */

export const MEDIA_WIDTHS = [160, 320, 480, 640, 828] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

/** Qualité WebP des versions réduites : rendus 3D sans texte fin, différence invisible sur téléphone. */
export const MEDIA_QUALITY = 72;

/** Largeur demandée (?w=) si elle fait partie des largeurs acceptées, sinon null (image d'origine). */
export function parseMediaWidth(value: string | null | undefined): MediaWidth | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const width = Number(value);
  return (MEDIA_WIDTHS as readonly number[]).includes(width) ? (width as MediaWidth) : null;
}

/** Image servie par /media (adresse relative ou sur le domaine du site) : seule celle-ci peut être réduite. */
function mediaPath(src: string) {
  const match = /^(?:https:\/\/(?:www\.)?wooplans\.com)?(\/media\/[^?#]+)$/.exec(src);
  return match ? match[1] : null;
}

/** Adresse d'une version réduite ; l'adresse d'origine pour une image externe. */
export function mediaUrl(src: string, width: MediaWidth) {
  const path = mediaPath(src);
  return path ? `${path}?w=${width}` : src;
}

/** Attribut srcset (largeurs indiquées) ; undefined pour une image externe, qui garde son src. */
export function mediaSrcSet(src: string, widths: readonly MediaWidth[]) {
  if (!mediaPath(src)) return undefined;
  return widths.map((w) => `${mediaUrl(src, w)} ${w}w`).join(", ");
}

/** Attributs prêts à poser sur un <img> : petite version par défaut, srcset pour les écrans plus larges ou plus denses. */
export function responsiveImage(src: string, widths: readonly MediaWidth[], sizes: string) {
  const srcSet = mediaSrcSet(src, widths);
  if (!srcSet) return { src };
  return { src: mediaUrl(src, widths[0]), srcSet, sizes };
}

/**
 * Tailles d'affichage courantes (attribut sizes).
 * Sur téléphone, la largeur annoncée est volontairement plus petite que la largeur réelle (50vw au lieu de 100vw) :
 * l'écran d'un téléphone récent a une densité de 2,5 à 3, et le navigateur prendrait sinon la plus grande version
 * (828 px). Avec 50vw, il prend 640 px (480 px sur un téléphone d'entrée de gamme) : assez net pour un rendu 3D, et deux fois plus léger pour un visiteur en 3G.
 */
export const SIZES = {
  /** Galerie de la fiche : pleine largeur sur téléphone, colonne de gauche (≈ 56 %) sur ordinateur. */
  gallery: "(min-width: 1024px) 56vw, 50vw",
  /** Vignettes sous la galerie : environ 18 % de la galerie (une seule version de 160 px). */
  thumb: "(min-width: 1024px) 10vw, 18vw",
  /** Cartes de modèle : 3 colonnes sur ordinateur ; 2 colonnes, ou pleine largeur sur téléphone (même plafonnement que la galerie). */
  card: "(min-width: 1024px) 33vw, 50vw",
} as const;
