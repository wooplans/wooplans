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
  budgetMin?: number | null;
  budgetMax?: number | null;
};

/** Modèle montré en aperçu : seuls les intitulés des postes du devis sont exposés, jamais les montants. */
export type PreviewPlan = GalleryPlan & {
  bathrooms: number;
  roomsCount: number;
  floorPlansCount: number;
  lotLabels: string[];
};

const CATEGORY: Record<string, string> = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble", autre: "Autre" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function imageUrl(ref: string) {
  if (/^https:\/\//.test(ref) || ref.startsWith("/")) return ref;
  return `/media/${ref.split("/").map(encodeURIComponent).join("/")}`;
}

/** « 25 – 31 M FCFA » (budget indicatif public de la fiche). */
export function budgetLabel(min?: number | null, max?: number | null) {
  const m = (v: number) => {
    const x = v / 1_000_000;
    return (x >= 10 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, "")).replace(".", ",");
  };
  if (min && max && max > min) return `${m(min)} – ${m(max)} M FCFA`;
  const one = min || max;
  return one ? `≈ ${m(one)} M FCFA` : null;
}

function facts(p: GalleryPlan) {
  return [
    p.levels <= 1 ? "Plain-pied" : p.levels === 2 ? "Duplex R+1" : `R+${p.levels - 1}`,
    p.surfaceTotal ? `${p.surfaceTotal} m²` : null,
    p.bedrooms ? `${p.bedrooms} chambre${p.bedrooms > 1 ? "s" : ""}` : null,
  ].filter((f): f is string => Boolean(f));
}

/** Cartes de la galerie : rendu de couverture, caractéristiques et budget indicatif (données de la fiche). */
export function galleryHtml(plans: GalleryPlan[]) {
  return plans
    .filter((p) => p.coverImage)
    .map((p) => {
      const budget = budgetLabel(p.budgetMin, p.budgetMax);
      return `<article class="model"><img src="${escapeHtml(imageUrl(p.coverImage))}" width="600" height="375" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}"><div><span class="type">${escapeHtml(CATEGORY[p.category] ?? p.category)}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(facts(p).join(" · "))}</p>${budget ? `<p class="budget">Budget indicatif : ${escapeHtml(budget)}</p>` : ""}</div></article>`;
    })
    .join("");
}

/** Croquis de plan générique (flouté à l'affichage) : aucun plan réel n'est exposé. */
const PLAN_SKETCH =
  '<svg viewBox="0 0 320 150" aria-hidden="true"><g fill="none" stroke="#5E7487" stroke-width="4"><rect x="20" y="14" width="280" height="120"/><path d="M120 14v70M120 104v30M20 74h60M100 74h20M200 14v40M200 74v60M200 74h40M260 74h40"/></g><g fill="none" stroke="#9FB0BF" stroke-width="1.5"><path d="M20 4h280M20 0v8M300 0v8M310 14v120M306 14h8M306 134h8"/></g><g fill="#7C8EA0" font-size="9" font-family="Arial"><text x="45" y="48">Chambre</text><text x="140" y="48">Salon</text><text x="225" y="40">Cuisine</text><text x="45" y="108">Chambre</text><text x="140" y="124">SAM</text><text x="225" y="108">Garage</text></g></svg>';

/** Aperçu d'un vrai modèle : ce que l'acheteur débloque, montants et plans masqués. */
export function previewHtml(p: PreviewPlan | null) {
  if (!p || !p.coverImage) return "";
  const chips = [...facts(p), p.bathrooms ? `${p.bathrooms} salle${p.bathrooms > 1 ? "s" : ""} de bain` : null, budgetLabel(p.budgetMin, p.budgetMax)]
    .filter((c): c is string => Boolean(c))
    .map((c) => `<span>${escapeHtml(c)}</span>`)
    .join("");
  const lots = p.lotLabels
    .slice(0, 8)
    .map((label) => `<li><span>${escapeHtml(label)}</span><i></i></li>`)
    .join("");
  return `<article class="preview"><div class="preview-media"><img src="${escapeHtml(imageUrl(p.coverImage))}" width="800" height="450" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}"><span class="tag">Exemple réel</span></div><div class="preview-body"><h3>${escapeHtml(p.name)}</h3><div class="chips">${chips}</div><div class="unlock">${
    p.floorPlansCount ? `<h4>Plan coté <span class="lock">après achat</span></h4><div class="planlock">${PLAN_SKETCH}<span><b>Plan coté visible après achat</b></span></div>` : ""
  }${
    lots ? `<h4>Devis détaillé par poste <span class="lock">montants après achat</span></h4><ul class="lots">${lots}<li class="total"><span>Total estimatif</span><i></i></li></ul>` : ""
  }${p.roomsCount ? `<h4>${p.roomsCount} pièces avec leur surface <span class="lock">après achat</span></h4>` : ""}<h4>Fiche PDF</h4><div class="pdfline"><span class="doc"></span><span><b>Fiche-WOOPLANS-${escapeHtml(p.name.split(" ").pop() ?? "")}.pdf</b><br>Rendus, plan coté, devis : à imprimer ou à montrer à votre maçon.</span></div></div></div></article>`;
}

/** Le prix du catalogue passe à 60 000 FCFA quand le catalogue atteint ce nombre de modèles publiés. */
export const PRICE_STEP_AT = 100;

/** Progression vers le palier de prix : modèles restants (libellé accordé) et part atteinte, en %. */
export function priceStep(count: number, at = PRICE_STEP_AT) {
  const left = Math.max(0, at - count);
  return {
    reached: left === 0,
    leftLabel: `${left} modèle${left > 1 ? "s" : ""}`,
    percent: Math.min(100, Math.max(0, Math.round((count / at) * 100))),
  };
}

/** Prix du catalogue ramené à un modèle, arrondi à la dizaine : « environ 620 ». */
export function perModelLabel(count: number, price: number) {
  return `environ ${Math.round(price / count / 10) * 10}`;
}
