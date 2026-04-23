export type PlanCategory = "villa" | "duplex";

export type EstimateLine = {
  code: string;
  label: string;
  amount: number;
};

export type EstimateGroup = {
  label: string;
  startCode: string;
  endCode: string;
  amount: number;
};

export type CostEstimate = {
  category: PlanCategory;
  total: number;
  amountPerSquareMeter: number;
  lines: EstimateLine[];
  groups: EstimateGroup[];
};

type EstimateTemplate = {
  lines: Array<{
    code: string;
    label: string;
    ratio: number;
  }>;
  groups: Array<{
    label: string;
    startCode: string;
    endCode: string;
  }>;
};

const ROUNDING_UNIT = 100;

export const ESTIMATE_TEMPLATES: Record<PlanCategory, EstimateTemplate> = {
  villa: {
    lines: [
      { code: "100", label: "FONDATION", ratio: 3784200 / 31005000 },
      { code: "200", label: "ELEVATIONS", ratio: 5541150 / 31005000 },
      { code: "300", label: "CHARPENTE ET TOITURE", ratio: 4189650 / 31005000 },
      { code: "400", label: "CREPISSAGE ET ANTIVOLS", ratio: 4197600 / 31005000 },
      { code: "500", label: "PORTES ET FENETRES", ratio: 3148200 / 31005000 },
      { code: "600", label: "PLOMBERIE ET ELECTRICITE", ratio: 2623500 / 31005000 },
      { code: "700", label: "PLAFOND ET PEINTURE", ratio: 3672900 / 31005000 },
      { code: "800", label: "CARRELAGE", ratio: 3847800 / 31005000 },
    ],
    groups: [
      { label: "GROS OEUVRE", startCode: "100", endCode: "300" },
      { label: "FINITIONS", startCode: "400", endCode: "800" },
    ],
  },
  duplex: {
    lines: [
      { code: "100", label: "FONDATION", ratio: 5135700 / 58830000 },
      { code: "200", label: "ELEVATION RDC", ratio: 3784200 / 58830000 },
      { code: "300", label: "DALLE", ratio: 7298100 / 58830000 },
      { code: "400", label: "ELEVATION ETAGE", ratio: 4324800 / 58830000 },
      { code: "500", label: "CHARPENTE ET TOITURE", ratio: 6487200 / 58830000 },
      { code: "600", label: "CREPISSAGE ET ANTIVOLS", ratio: 7632000 / 58830000 },
      { code: "700", label: "PORTES ET FENETRES", ratio: 5724000 / 58830000 },
      { code: "800", label: "PLOMBERIE ET ELECTRICITE", ratio: 4770000 / 58830000 },
      { code: "900", label: "PLAFOND ET PEINTURE", ratio: 6678000 / 58830000 },
      { code: "1000", label: "CARRELAGE", ratio: 6996000 / 58830000 },
    ],
    groups: [
      { label: "GROS OEUVRE", startCode: "100", endCode: "500" },
      { label: "FINITIONS", startCode: "600", endCode: "1000" },
    ],
  },
};

export function isPlanCategory(value: string): value is PlanCategory {
  return value === "villa" || value === "duplex";
}

export function roundToNearestHundred(value: number) {
  return Math.round(value / ROUNDING_UNIT) * ROUNDING_UNIT;
}

export function buildCostEstimate(
  category: PlanCategory,
  surface: number,
  amountPerSquareMeter: number,
): CostEstimate {
  const template = ESTIMATE_TEMPLATES[category];
  const total = roundToNearestHundred(surface * amountPerSquareMeter);
  const lines = template.lines.map((line) => ({
    code: line.code,
    label: line.label,
    amount: roundToNearestHundred(total * line.ratio),
  }));
  const currentTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const adjustment = total - currentTotal;

  if (lines.length > 0 && adjustment !== 0) {
    lines[lines.length - 1] = {
      ...lines[lines.length - 1],
      amount: lines[lines.length - 1].amount + adjustment,
    };
  }

  const groups = template.groups.map((group) => {
    const startIndex = lines.findIndex((line) => line.code === group.startCode);
    const endIndex = lines.findIndex((line) => line.code === group.endCode);
    const groupLines = startIndex >= 0 && endIndex >= startIndex
      ? lines.slice(startIndex, endIndex + 1)
      : [];

    return {
      ...group,
      amount: groupLines.reduce((sum, line) => sum + line.amount, 0),
    };
  });

  return {
    category,
    total,
    amountPerSquareMeter,
    lines,
    groups,
  };
}
