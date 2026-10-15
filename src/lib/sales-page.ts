/**
 * Page de vente /catalogue-premium : choix de la variante (A/B) et fragments dynamiques
 * de la variante B. Module pur (testé sous Node).
 */

export type Variant = "a" | "b";
export const VARIANT_COOKIE = "wp_lp";

/**
 * ?variante=a|b force la variante (aperçu, mémorisé par cookie) ; sinon le cookie du visiteur ;
 * sinon tirage selon la part de trafic B (0 à 100). Avec une part de 0, aucun cookie n'est posé.
 */
export function chooseVariant(params: { query: string | null; cookie: string | undefined; share: number; random: number }): {
  variant: Variant;
  remember: boolean;
} {
  const forced = params.query?.toLowerCase();
  if (forced === "a" || forced === "b") return { variant: forced, remember: true };
  const share = Number.isFinite(params.share) ? Math.min(100, Math.max(0, params.share)) : 0;
  if (params.cookie === "a" || params.cookie === "b") {
    // Une part ramenée à 0 (ou 100) s'impose aux visiteurs déjà répartis.
    if (share === 0) return { variant: "a", remember: false };
    if (share === 100) return { variant: "b", remember: false };
    return { variant: params.cookie, remember: false };
  }
  if (share === 0) return { variant: "a", remember: false };
  return { variant: params.random * 100 < share ? "b" : "a", remember: true };
}

export type GalleryPlan = {
  name: string;
  category: string;
  coverImage: string;
  levels: number;
  surfaceTotal: number;
  bedrooms: number;
};

const CATEGORY: Record<string, string> = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble", autre: "Autre" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function imageUrl(ref: string) {
  if (/^https:\/\//.test(ref) || ref.startsWith("/")) return ref;
  return `/media/${ref.split("/").map(encodeURIComponent).join("/")}`;
}

/** Cartes de la galerie : rendu de couverture, nom, niveaux, surface, chambres (données de la fiche). */
export function galleryHtml(plans: GalleryPlan[]) {
  const delays = ["", " d1", " d2"];
  return plans
    .filter((p) => p.coverImage)
    .map((p, i) => {
      const facts = [
        p.levels <= 1 ? "Plain-pied" : p.levels === 2 ? "Deux niveaux" : `${p.levels} niveaux`,
        p.surfaceTotal ? `${p.surfaceTotal} m²` : null,
        p.bedrooms ? `${p.bedrooms} chambre${p.bedrooms > 1 ? "s" : ""}` : null,
      ].filter(Boolean);
      const type = CATEGORY[p.category] ?? p.category;
      return `<article class="model-card r${delays[i % 3]}"><img src="${escapeHtml(imageUrl(p.coverImage))}" width="800" height="450" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}"><div class="model-card-copy"><span class="model-card-type">${escapeHtml(type)}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(facts.join(" · "))}</p></div></article>`;
    })
    .join("");
}
