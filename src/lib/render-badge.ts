/**
 * Repère la pastille « Visitez wooplans.com » incrustée en bas à gauche des rendus publics.
 * Module pur : il reçoit les pixels (RGB) du quart bas gauche de l'image, réduit à
 * BADGE_SAMPLE (Cloudflare Images s'occupe du recadrage et de la réduction).
 *
 * Deux styles de pastille existent : grande verte (≈ 30,122,57) et petite vert foncé à icône
 * (≈ 15,85,85). Les deux sont des aplats sombres à dominante verte, longs d'au moins 40 % de la
 * zone ; l'herbe des rendus est plus jaune (peu de bleu) et ne forme pas de longue ligne continue.
 * Seuils réglés sur les 912 rendus de R2 (10/2026) : avec pastille, part ≥ 0,14 et ligne ≥ 75/160 ;
 * sans pastille, part ≤ 0,01 et ligne ≤ 14/160. Entre les deux : inconnu (null), jamais supposé.
 */

/** Zone analysée : moitié gauche, 22 % du bas de l'image. */
export const BADGE_ZONE = { widthShare: 0.5, topShare: 0.78 };
/** Taille de l'échantillon analysé (pixels). */
export const BADGE_SAMPLE = { width: 160, height: 44 };

export function isBadgePixel(r: number, g: number, b: number) {
  return r <= 70 && g >= 70 && g <= 150 && g - r >= 40 && b >= 42 && b <= g + 12;
}

/** true : pastille présente ; false : aucune trace ; null : indécidable ou pixels illisibles. */
export function detectBadge(rgb: Uint8Array, width = BADGE_SAMPLE.width, height = BADGE_SAMPLE.height): boolean | null {
  if (!width || !height || rgb.length !== width * height * 3) return null;
  let count = 0;
  let longest = 0;
  for (let y = 0; y < height; y++) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      if (isBadgePixel(rgb[i], rgb[i + 1], rgb[i + 2])) {
        count++;
        run++;
        if (run > longest) longest = run;
      } else run = 0;
    }
  }
  const share = count / (width * height);
  if (share >= 0.1 && longest >= 0.4 * width) return true;
  if (share < 0.02 && longest < 0.1 * width) return false;
  return null;
}
