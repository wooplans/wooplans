/**
 * Vignette de partage (WhatsApp, Facebook…) d'un modèle : rendu de couverture recadré en JPEG 1200 × 675 (16:9, le format des rendus).
 * WhatsApp n'affiche pas d'aperçu pour une image WebP ou trop lourde (au-delà d'environ 300 Ko) :
 * la couverture d'origine, souvent en WebP ou en JPEG de plus de 1 Mo, n'est donc pas utilisée telle quelle.
 * Module sans dépendance pour pouvoir être testé isolément.
 */

export const SHARE_IMAGE = { width: 1200, height: 675, quality: 75 } as const;

/** Adresse de la vignette (/og/<clé R2>.jpg) pour une couverture servie par /media, sinon null. */
export function shareImagePath(coverImage: string | null | undefined) {
  if (!coverImage?.startsWith("/media/")) return null;
  const key = coverImage.slice("/media/".length);
  return key ? `/og/${key}.jpg` : null;
}

/** Clé R2 de la couverture à partir des segments de /og/… (le suffixe .jpg ajouté par shareImagePath est retiré). */
export function shareImageKey(path: string) {
  return path.endsWith(".jpg") ? path.slice(0, -".jpg".length) : null;
}
