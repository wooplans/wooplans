/**
 * Page de vente /catalogue-premium : fragments dynamiques (galerie, aperçu, nombre de modèles).
 * Module pur (testé sous Node).
 */

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

/** Modèle de démonstration de la page de vente (le même que dans la VSL) : plans cotés et devis montrés en entier. */
export const SHOWCASE_CODE = "D4-006";

/** Modèle montré en aperçu : échantillon complet du catalogue (plans cotés filigranés, devis avec ses montants). */
export type PreviewPlan = GalleryPlan & {
  bathrooms: number;
  roomsCount: number;
  /** Adresses publiques des plans cotés de l'échantillon (/api/apercu/plan/<n>), filigranées. */
  floorPlanUrls: string[];
  lots: { label: string; amount: number }[];
  /** Nombre de modèles publiés (fiche PDF téléchargeable pour chacun). */
  modelsCount?: number;
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, "\u00a0")}\u00a0FCFA`;

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

/** Aperçu d'un vrai modèle : un échantillon complet de ce que contient le catalogue pour chaque modèle. */
export function previewHtml(p: PreviewPlan | null) {
  if (!p || !p.coverImage) return "";
  const chips = [...facts(p), p.bathrooms ? `${p.bathrooms} salle${p.bathrooms > 1 ? "s" : ""} de bain` : null, budgetLabel(p.budgetMin, p.budgetMax)]
    .filter((c): c is string => Boolean(c))
    .map((c) => `<span>${escapeHtml(c)}</span>`)
    .join("");
  const levelName = (i: number, n: number) => (n === 1 ? "Plan coté" : i === 0 ? "Rez-de-chaussée" : i === 1 && n === 2 ? "Étage" : `Niveau ${i}`);
  const plans = p.floorPlanUrls
    .map((url, i, all) => `<figure><img src="${escapeHtml(url)}" width="800" height="820" loading="lazy" decoding="async" alt="${escapeHtml(levelName(i, all.length))} coté : ${escapeHtml(p.name)}"><figcaption>${escapeHtml(levelName(i, all.length))}</figcaption></figure>`)
    .join("");
  const total = p.lots.reduce((sum, l) => sum + l.amount, 0);
  const lots = p.lots.map((l) => `<li><span>${escapeHtml(l.label)}</span><b>${fcfa(l.amount)}</b></li>`).join("");
  const code = escapeHtml(p.name.split(" ").pop() ?? "");
  const all = p.modelsCount ? `pour chacun des ${p.modelsCount} modèles du catalogue` : "pour chaque modèle du catalogue";
  return `<article class="preview"><div class="preview-media"><img src="${escapeHtml(imageUrl(p.coverImage))}" width="800" height="450" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}"><span class="tag">Exemple réel</span></div><div class="preview-body"><h3>${escapeHtml(p.name)}</h3><div class="chips">${chips}</div><div class="unlock">${
    plans ? `<h4>Plan de distribution coté</h4><div class="plans">${plans}</div>` : ""
  }${
    lots ? `<h4>Devis détaillé par poste</h4><ul class="lots">${lots}<li class="total"><span>Total estimatif</span><b>${fcfa(total)}</b></li></ul>` : ""
  }${p.roomsCount ? `<h4>${p.roomsCount} pièces avec leur surface</h4>` : ""}<h4>Fiche PDF téléchargeable</h4><div class="pdfline"><span class="doc"></span><span><b>Fiche-WOOPLANS-${code}.pdf</b><br>Rendus 3D, plans cotés et devis : une fiche PDF à télécharger ${all}, dès votre accès au catalogue.</span></div></div></div></article>`;
}

/** Prix du catalogue ramené à un modèle, arrondi à la dizaine : « environ 620 ». */
export function perModelLabel(count: number, price: number) {
  return `environ ${Math.round(price / count / 10) * 10}`;
}
