/**
 * Valeurs calculées d'un modèle : terrain nécessaire (à partir des dimensions du bâtiment) et devis
 * de construction (surface × prix au m² × coefficient de standing, réparti en postes par pourcentages).
 * Module pur (aucune dépendance Cloudflare) : testé dans tests/plan-pricing.test.ts.
 */

export const STANDINGS = ["bas", "standard", "eleve"] as const;
export type Standing = (typeof STANDINGS)[number];

export const STANDING_LABELS: Record<Standing, string> = {
  bas: "Bas standing",
  standard: "Standing moyen",
  eleve: "Standing élevé",
};

export function isStanding(value: unknown): value is Standing {
  return typeof value === "string" && (STANDINGS as readonly string[]).includes(value);
}

export type CostSettings = {
  /** Prix de construction au m² de surface totale (FCFA) */
  ratePerM2: { villa: number; duplex: number };
  /** Multiplicateur du devis total selon le standing */
  standingCoef: Record<Standing, number>;
};

/** Valeurs relevées sur le catalogue : 200 000 FCFA/m² pour les villas comme pour les duplex. */
export const DEFAULT_COST_SETTINGS: CostSettings = {
  ratePerM2: { villa: 200_000, duplex: 200_000 },
  standingCoef: { bas: 0.8, standard: 1, eleve: 1.2 },
};

/** Complète des réglages enregistrés (éventuellement partiels ou anciens) avec les valeurs par défaut. */
export function normalizeCostSettings(raw: unknown): CostSettings {
  const r = (raw ?? {}) as Partial<{ ratePerM2: Partial<CostSettings["ratePerM2"]>; standingCoef: Partial<CostSettings["standingCoef"]> }>;
  const positive = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback);
  const d = DEFAULT_COST_SETTINGS;
  return {
    ratePerM2: {
      villa: positive(r.ratePerM2?.villa, d.ratePerM2.villa),
      duplex: positive(r.ratePerM2?.duplex, d.ratePerM2.duplex),
    },
    standingCoef: {
      bas: positive(r.standingCoef?.bas, d.standingCoef.bas),
      standard: positive(r.standingCoef?.standard, d.standingCoef.standard),
      eleve: positive(r.standingCoef?.eleve, d.standingCoef.eleve),
    },
  };
}

/**
 * Postes du devis en points de base (1/100 de %), repris des devis du catalogue :
 * gros œuvre 45 % du total, finitions 55 %, même répartition des finitions pour villas et duplex.
 */
const FINITIONS = [
  { label: "Crépissage et antivols", share: 1320 },
  { label: "Portes et fenêtres", share: 990 },
  { label: "Plomberie et électricité", share: 825 },
  { label: "Plafond et peinture", share: 1155 },
  { label: "Carrelage", share: 1210 },
];

export const ESTIMATE_POSTS: Record<"villa" | "duplex", { label: string; share: number }[]> = {
  villa: [
    { label: "Fondation", share: 1260 },
    { label: "Élévations", share: 1845 },
    { label: "Charpente et toiture", share: 1395 },
    ...FINITIONS,
  ],
  duplex: [
    { label: "Fondation", share: 855 },
    { label: "Élévation RDC", share: 630 },
    { label: "Dalle", share: 1215 },
    { label: "Élévation étage", share: 720 },
    { label: "Charpente et toiture", share: 1080 },
    ...FINITIONS,
  ],
};

export function hasAutomaticEstimate(category: string): category is "villa" | "duplex" {
  return category === "villa" || category === "duplex";
}

/** Terrain : bâtiment + 3 m en largeur et + 7 m en profondeur ; surface arrondie au multiple de 50 m² inférieur. */
export function computeLand(buildingWidth: number | null | undefined, buildingDepth: number | null | undefined) {
  if (!buildingWidth || !buildingDepth || buildingWidth <= 0 || buildingDepth <= 0) return null;
  const landWidth = buildingWidth + 3;
  const landDepth = buildingDepth + 7;
  return { landWidth, landDepth, landArea: Math.floor((landWidth * landDepth) / 50) * 50 };
}

/** Devis : total arrondi au millier, postes à la centaine ; le dernier poste absorbe l'arrondi. */
export function computeEstimate(category: string, surfaceTotal: number, standing: Standing, settings: CostSettings) {
  if (!hasAutomaticEstimate(category) || !surfaceTotal || surfaceTotal <= 0) return null;
  const total = Math.round((surfaceTotal * settings.ratePerM2[category] * settings.standingCoef[standing]) / 1000) * 1000;
  const posts = ESTIMATE_POSTS[category];
  const lots = posts.map((p) => ({ label: p.label, amount: Math.round((total * p.share) / 10000 / 100) * 100 }));
  const rest = total - lots.slice(0, -1).reduce((sum, l) => sum + l.amount, 0);
  lots[lots.length - 1] = { ...lots[lots.length - 1], amount: rest };
  return { total, lots };
}

/** Fourchette affichée sur la vitrine : devis ± 10 %, arrondi aux 100 000 FCFA. */
export function budgetRange(total: number) {
  return {
    budgetMin: Math.round((total * 0.9) / 100_000) * 100_000,
    budgetMax: Math.round((total * 1.1) / 100_000) * 100_000,
  };
}

type PlanInputs = {
  category: string;
  surfaceTotal: number;
  standing: string | null | undefined;
  buildingWidth: number | null | undefined;
  buildingDepth: number | null | undefined;
};

/**
 * Champs calculés à enregistrer avec un modèle. Seuls les champs calculables sont renvoyés :
 * sans dimensions du bâtiment, le terrain saisi reste tel quel ; hors villa/duplex, le devis reste manuel.
 */
export function derivedPlanFields(plan: PlanInputs, settings: CostSettings) {
  const out: {
    landWidth?: number;
    landDepth?: number;
    landArea?: number;
    estimateTotal?: number;
    estimateLots?: { label: string; amount: number }[];
    budgetMin?: number;
    budgetMax?: number;
  } = {};
  const land = computeLand(plan.buildingWidth, plan.buildingDepth);
  if (land) Object.assign(out, land);
  const estimate = computeEstimate(plan.category, plan.surfaceTotal, isStanding(plan.standing) ? plan.standing : "standard", settings);
  if (estimate) Object.assign(out, { estimateTotal: estimate.total, estimateLots: estimate.lots }, budgetRange(estimate.total));
  return out;
}
