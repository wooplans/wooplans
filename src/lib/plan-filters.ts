import type { PublicPlan } from "@/lib/plans";

export type PlanFilters = {
  categorie?: string;
  chambres?: string;
  niveaux?: string;
  budget?: string;
  terrain?: string;
  /** Recherche par référence ou nom (espace Premium). */
  q?: string;
};

/** Champs nécessaires au filtrage, envoyés au navigateur avec chaque carte. */
export type PlanFilterData = Pick<PublicPlan, "id" | "code" | "name" | "category" | "bedrooms" | "levels" | "budgetMin" | "budgetMax" | "landArea">;

export const BUDGET_OPTIONS = [
  { value: "20", label: "Jusqu'à 20 millions" },
  { value: "30", label: "Jusqu'à 30 millions" },
  { value: "45", label: "Jusqu'à 45 millions" },
  { value: "70", label: "Jusqu'à 70 millions" },
];

export const LAND_OPTIONS = [
  { value: "300", label: "Terrain ≤ 300 m²" },
  { value: "400", label: "Terrain ≤ 400 m²" },
  { value: "500", label: "Terrain ≤ 500 m²" },
  { value: "800", label: "Terrain ≤ 800 m²" },
];

export function applyPlanFilters<
  T extends Pick<PublicPlan, "category" | "bedrooms" | "levels" | "budgetMin" | "budgetMax" | "landArea"> & Partial<Pick<PublicPlan, "code" | "name">>,
>(plans: T[], f: PlanFilters) {
  const q = f.q?.trim().toLowerCase();
  return plans.filter((p) => {
    if (q && !(p.code ?? "").toLowerCase().includes(q) && !(p.name ?? "").toLowerCase().includes(q)) return false;
    if (f.categorie && p.category !== f.categorie) return false;
    if (f.chambres) {
      const n = Number(f.chambres);
      if (n >= 5 ? p.bedrooms < 5 : p.bedrooms !== n) return false;
    }
    if (f.niveaux) {
      const n = Number(f.niveaux);
      if (n >= 2 ? p.levels < 2 : p.levels !== 1) return false;
    }
    if (f.budget) {
      const max = Number(f.budget) * 1_000_000;
      const reference = p.budgetMin ?? p.budgetMax;
      if (!reference || reference > max) return false;
    }
    if (f.terrain) {
      if (!p.landArea || p.landArea > Number(f.terrain)) return false;
    }
    return true;
  });
}

/* ─── Filtres de la vitrine (/catalogue) ─── */

export const FILTER_KEYS = ["q", "categorie", "budget", "chambres", "niveaux", "terrain"] as const;

/** Type de plan : la catégorie dit déjà le nombre de niveaux (villa = plain-pied, duplex = à étage). */
export const TYPE_OPTIONS = [
  { value: undefined, label: "Tous", hint: "villas et duplex" },
  { value: "villa", label: "Villas", hint: "plain-pied" },
  { value: "duplex", label: "Duplex", hint: "à étage" },
] as const;

/** Ne garde que les filtres renseignés : l'URL et les puces n'affichent pas de paramètres vides. */
export function cleanFilters(f: PlanFilters): PlanFilters {
  const out: PlanFilters = {};
  for (const key of FILTER_KEYS) if (f[key]) out[key] = f[key];
  return out;
}

/** Filtres lus dans une adresse (?categorie=villa&chambres=4…), comme le serveur les reçoit. */
export function filtersFromSearch(search: string): PlanFilters {
  const params = new URLSearchParams(search);
  const out: PlanFilters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function catalogueHref(f: PlanFilters, basePath = "/catalogue") {
  const query = new URLSearchParams(cleanFilters(f) as Record<string, string>).toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Options de chambres présentes dans le catalogue (5 = « 5 et plus »), pour ne jamais proposer un choix vide. */
export function bedroomOptions(plans: { bedrooms: number }[]) {
  const values = [...new Set(plans.map((p) => Math.min(p.bedrooms, 5)))].filter((n) => n > 0).sort((a, b) => a - b);
  return values.map((n) => ({ value: String(n), label: n >= 5 ? "5 ch. +" : `${n} ch.` }));
}

/** Puces des filtres actifs, chacune avec le libellé affiché et la clé à retirer. */
export function activeFilterChips(f: PlanFilters) {
  const chips: { key: keyof PlanFilters; label: string }[] = [];
  if (f.q?.trim()) chips.push({ key: "q", label: `« ${f.q.trim()} »` });
  if (f.categorie) chips.push({ key: "categorie", label: f.categorie === "villa" ? "Villas" : f.categorie === "duplex" ? "Duplex" : f.categorie });
  if (f.budget) chips.push({ key: "budget", label: `Budget ≤ ${f.budget} M FCFA` });
  if (f.chambres) chips.push({ key: "chambres", label: Number(f.chambres) >= 5 ? "5 chambres et +" : `${f.chambres} chambres` });
  // Anciens liens (filtres retirés de l'interface) : affichés pour pouvoir les enlever.
  if (f.niveaux) chips.push({ key: "niveaux", label: Number(f.niveaux) >= 2 ? "À étage" : "Plain-pied" });
  if (f.terrain) chips.push({ key: "terrain", label: `Terrain ≤ ${f.terrain} m²` });
  return chips;
}
