import type { PublicPlan } from "@/lib/plans";

export type PlanFilters = {
  categorie?: string;
  chambres?: string;
  niveaux?: string;
  budget?: string;
  terrain?: string;
};

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

export function applyPlanFilters<T extends Pick<PublicPlan, "category" | "bedrooms" | "levels" | "budgetMin" | "budgetMax" | "landArea">>(
  plans: T[],
  f: PlanFilters,
) {
  return plans.filter((p) => {
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
