/** Formatage des modèles utilisable côté navigateur (aucun accès à la base). */

export type PlanCategory = "villa" | "duplex" | "immeuble" | "autre";

export const CATEGORY_LABELS: Record<PlanCategory, string> = {
  villa: "Villa",
  duplex: "Duplex",
  immeuble: "Immeuble",
  autre: "Autre",
};

/** « 25 – 30 millions FCFA » : budget arrondi pour la vitrine. */
export function formatBudgetRange(min: number | null, max: number | null) {
  const toM = (v: number) => {
    const m = v / 1_000_000;
    return m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(".", ",").replace(",0", "");
  };
  if (min && max && max > min) return `${toM(min)} – ${toM(max)} millions FCFA`;
  const single = min || max;
  return single ? `≈ ${toM(single)} millions FCFA` : null;
}

export function levelsLabel(levels: number) {
  if (levels <= 1) return "Plain-pied";
  return levels === 2 ? "R+1" : `R+${levels - 1}`;
}
