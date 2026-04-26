import { ensureD1Schema } from "@/lib/d1-schema";
import { getPrisma } from "@/lib/prisma";
import { isPlanCategory, type PlanCategory } from "@/lib/cost-estimate";

export const DEFAULT_REGION = "default";
export const DEFAULT_COST_RATE_VALUES: Record<PlanCategory, number> = {
  villa: 150000,
  duplex: 180000,
};

export type CostRateRecord = {
  id: string;
  category: PlanCategory;
  region: string;
  amountPerSquareMeter: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapCostRate(row: {
  id: string;
  category: string;
  region: string;
  amountPerSquareMeter: number;
  createdAt: Date;
  updatedAt: Date;
}): CostRateRecord | null {
  if (!isPlanCategory(row.category)) {
    return null;
  }

  return {
    ...row,
    category: row.category,
    amountPerSquareMeter: Number(row.amountPerSquareMeter) || 0,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function listDefaultCostRates() {
  let rates: CostRateRecord[] = [];

  try {
    await ensureD1Schema();
    const prisma = getPrisma();
    const rows = await prisma.costRate.findMany({
      where: { region: DEFAULT_REGION },
      orderBy: { category: "asc" },
    });

    rates = rows
      .map((row) => mapCostRate(row))
      .filter((row): row is CostRateRecord => Boolean(row));
  } catch (error) {
    console.error("Failed to load cost rates:", error);
  }

  return (Object.keys(DEFAULT_COST_RATE_VALUES) as PlanCategory[]).map((category) => {
    const existing = rates.find((rate) => rate.category === category);

    if (existing) {
      return existing;
    }

    return {
      id: `default-${category}`,
      category,
      region: DEFAULT_REGION,
      amountPerSquareMeter: DEFAULT_COST_RATE_VALUES[category],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  });
}

export async function getDefaultCostRate(category: string) {
  if (!isPlanCategory(category)) {
    return null;
  }

  try {
    await ensureD1Schema();
    const prisma = getPrisma();
    const row = await prisma.costRate.findUnique({
      where: {
        category_region: {
          category,
          region: DEFAULT_REGION,
        },
      },
    });

    if (row) {
      return mapCostRate(row);
    }
  } catch (error) {
    console.error("Failed to load cost rate:", error);
  }

  return {
    id: `default-${category}`,
    category,
    region: DEFAULT_REGION,
    amountPerSquareMeter: DEFAULT_COST_RATE_VALUES[category],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function upsertDefaultCostRate(
  category: PlanCategory,
  amountPerSquareMeter: number,
) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const row = await prisma.costRate.upsert({
    where: {
      category_region: {
        category,
        region: DEFAULT_REGION,
      },
    },
    create: {
      id: crypto.randomUUID(),
      category,
      region: DEFAULT_REGION,
      amountPerSquareMeter,
    },
    update: {
      amountPerSquareMeter,
    },
  });

  return mapCostRate(row);
}
