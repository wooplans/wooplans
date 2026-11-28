/**
 * Page de vente anglaise /en/premium-catalogue (Ghana, Kenya ; décision de Tao du 28 nov. 2026) :
 * noms, caractéristiques, galerie et aperçu dans le vocabulaire de Maramani, sans aucun montant en FCFA
 * (les devis ne sont pas convertis : on montre la répartition du budget par poste, en pourcentage).
 * Module pur (testé sous Node).
 */

export type GalleryPlan = {
  slug?: string;
  name: string;
  category: string;
  coverImage: string;
  levels: number;
  surfaceTotal: number;
  bedrooms: number;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Poste du devis (base française) → libellé anglais (campagnes/anglophone/VOCABULAIRE_MARAMANI.md, dépôt studio). */
const LOT_EN: Record<string, string> = {
  "Fondation": "Substructure (foundation)",
  "Élévations": "Superstructure (walling)",
  "Élévation RDC": "Ground floor walling",
  "Dalle": "First floor slab",
  "Élévation étage": "First floor walling",
  "Charpente et toiture": "Roof",
  "Crépissage et antivols": "Plastering & burglar bars",
  "Portes et fenêtres": "Doors & Windows",
  "Plomberie et électricité": "Plumbing & Electrical Installations",
  "Plafond et peinture": "Ceiling & Painting",
  "Carrelage": "Floor & Wall Tiling",
};

export function lotLabelEn(label: string) {
  return LOT_EN[label.trim()] ?? label;
}

/** « 4 Bedroom Bungalow House – ID V4-005 », « Two-story 4 Bedroom House – ID D4-034 » (comme Maramani). */
export function modelNameEn(p: { name: string; levels: number; bedrooms: number; code?: string }) {
  const code = p.code || p.name.split(" ").pop() || p.name;
  const beds = p.bedrooms ? `${p.bedrooms} Bedroom ` : "";
  if (p.levels >= 3) return `${p.levels}-story ${beds}House – ID ${code}`;
  if (p.levels === 2) return `Two-story ${beds}House – ID ${code}`;
  return `${beds}Bungalow House – ID ${code}`;
}

/** « 1 Floor · 4 Bedrooms · 3 Bathrooms · 201 m² ». */
export function factsEn(p: GalleryPlan & { bathrooms?: number }) {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  return [
    n(Math.max(1, p.levels), "Floor", "Floors"),
    p.bedrooms ? n(p.bedrooms, "Bedroom", "Bedrooms") : null,
    p.bathrooms ? n(p.bathrooms, "Bathroom", "Bathrooms") : null,
    p.surfaceTotal ? `${p.surfaceTotal} m²` : null,
  ].filter((f): f is string => Boolean(f));
}

/** Parts du budget par poste, en % arrondi à 0,1 (la somme peut faire 99,9 ou 100,1). */
export function lotShares(lots: { label: string; amount: number }[]) {
  const total = lots.reduce((s, l) => s + l.amount, 0);
  if (!total) return [];
  return lots.map((l) => ({ label: lotLabelEn(l.label), share: Math.round((l.amount / total) * 1000) / 10 }));
}

function imageUrl(ref: string) {
  if (/^https:\/\//.test(ref) || ref.startsWith("/")) return ref;
  return `/media/${ref.split("/").map(encodeURIComponent).join("/")}`;
}

type EnGalleryPlan = GalleryPlan & { code?: string; bathrooms?: number };

/** Cartes de la galerie, en anglais, sans budget en FCFA. */
export function galleryHtmlEn(plans: EnGalleryPlan[], total = 0) {
  const shown = plans.filter((p) => p.coverImage);
  const cards = shown
    .map((p) => {
      const img = imageUrl(p.coverImage);
      const sized = (w: number) => (img.startsWith("/media/") ? `${img}?w=${w}` : img);
      const name = modelNameEn(p);
      const type = p.levels >= 2 ? "Two-story house" : "Bungalow";
      const f = factsEn(p).join(" · ");
      return `<article class="model" role="button" tabindex="0" data-model data-img="${escapeHtml(sized(960))}" data-name="${escapeHtml(name)}" data-type="${escapeHtml(type)}" data-facts="${escapeHtml(f)}" data-budget=""><img src="${escapeHtml(sized(480))}" width="600" height="375" loading="lazy" decoding="async" alt="3D render: ${escapeHtml(name)}"><div><span class="type">${escapeHtml(type)}</span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(f)}</p></div></article>`;
    })
    .join("");
  const rest = total - shown.length;
  const more = rest > 0
    ? `<article class="model more" role="button" tabindex="0" data-more><div><b>+${rest}</b><span>more house plans inside the Premium Catalogue</span><em>Get the catalogue →</em></div></article>`
    : "";
  return cards + more;
}

export type EnPreviewPlan = EnGalleryPlan & {
  bathrooms: number;
  floorPlanUrls: string[];
  lots: { label: string; amount: number }[];
  modelsCount?: number;
};

/** Aperçu d'un vrai modèle : rendu, plans cotés filigranés, répartition du budget (%) et calculateur. */
export function previewHtmlEn(p: EnPreviewPlan | null) {
  if (!p || !p.coverImage) return "";
  const name = modelNameEn(p);
  const chips = factsEn(p).map((c) => `<span>${escapeHtml(c)}</span>`).join("");
  const levelName = (i: number, n: number) => (n === 1 ? "Floor Plan" : i === 0 ? "Ground Floor Plan" : i === 1 && n === 2 ? "First Floor Plan" : `Floor ${i} Plan`);
  const plans = p.floorPlanUrls
    .map((url, i, all) => `<figure><img src="${escapeHtml(url)}" width="800" height="820" loading="lazy" decoding="async" alt="${escapeHtml(levelName(i, all.length))}: ${escapeHtml(name)}"><figcaption>${escapeHtml(levelName(i, all.length))}</figcaption></figure>`)
    .join("");
  const shares = lotShares(p.lots);
  const rows = shares
    .map((l, i) => `<li><span>${escapeHtml(l.label)}</span><b><i data-calc-share="${l.share}" data-calc-i="${i}">${l.share.toFixed(1)}%</i></b></li>`)
    .join("");
  return `<article class="preview"><div class="preview-media"><img src="${escapeHtml(imageUrl(p.coverImage))}" width="800" height="450" loading="lazy" decoding="async" alt="3D render: ${escapeHtml(name)}"><span class="tag">Real example</span></div><div class="preview-body"><h3>${escapeHtml(name)}</h3><div class="chips">${chips}</div><div class="unlock">${
    plans ? `<h4>Floor plans with dimensions</h4><div class="plans">${plans}</div>` : ""
  }${
    rows
      ? `<h4>Construction Cost Calculator</h4><div class="calc" data-calc data-area="${p.surfaceTotal}"><label>Your builder's price per m² <input type="number" inputmode="numeric" min="0" step="500" placeholder="Price per m²" data-calc-rate><span data-calc-cur></span></label><ul class="lots">${rows}<li class="total"><span>Estimated total (${p.surfaceTotal} m²)</span><b data-calc-total>Enter a price per m²</b></li></ul><p class="calc-note">Cost breakdown by item. Enter the price per m² quoted by your builder: the calculator splits it for you. Inside the catalogue: Basic, Standard and Luxury levels.</p></div>`
      : ""
  }</div></div></article>`;
}

export type EnCountry = { amount: number; currency: string; dial: string; example: string };
export type EnConfig = { productId: string; priceXaf: number; countries: Record<string, EnCountry>; defaultCountry: string };

/** « KES 8,892.42 » (montant exact au paiement Chariow) ; short = sans décimales (« KES 8,892 »). */
export function moneyEn(amount: number, currency: string, short = false) {
  const n = short ? Math.floor(amount) : amount;
  const s = n.toLocaleString("en-US", short ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${s}`;
}

/**
 * Prix affichés pour un pays : catalogue (montant relevé sur Chariow) et plans complets convertis au même taux que
 * Chariow (montant relevé ÷ 39 000 FCFA), arrondis à la dizaine, précédés de « ≈ ». Pays hors liste : pays par défaut.
 */
export function enPricing(cfg: EnConfig, country: string | null | undefined, fullPlansXaf: { villa: number; duplex: number }) {
  const cc = cfg.countries[(country || "").toUpperCase()] ? (country || "").toUpperCase() : cfg.defaultCountry;
  const c = cfg.countries[cc];
  const rate = c.amount / cfg.priceXaf;
  const approx = (xaf: number) => `≈ ${c.currency} ${(Math.round((xaf * rate) / 10) * 10).toLocaleString("en-US")}`;
  return {
    country: cc,
    currency: c.currency,
    price: moneyEn(c.amount, c.currency, true),
    priceExact: moneyEn(c.amount, c.currency),
    villa: approx(fullPlansXaf.villa),
    duplex: approx(fullPlansXaf.duplex),
    pay: cc === "KE" ? ["M-Pesa", "Card"] : cc === "GH" ? ["MTN MoMo", "Telecel Cash", "Card"] : ["Mobile Money", "Card"],
  };
}
