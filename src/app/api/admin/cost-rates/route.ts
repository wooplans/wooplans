import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  getDefaultCostRate,
  upsertDefaultCostRate,
} from "@/lib/cost-rates";
import { type PlanCategory } from "@/lib/cost-estimate";

export const runtime = "edge";

const CATEGORIES: PlanCategory[] = ["villa", "duplex"];

async function requireAdmin(request: Request) {
  const session = await requireRole(request, "admin");
  return Boolean(session);
}

async function serializeRates() {
  const entries = await Promise.all(
    CATEGORIES.map(async (category) => {
      const rate = await getDefaultCostRate(category);
      return [category, rate?.amountPerSquareMeter ?? null] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<PlanCategory, number | null>;
}

function parseAmount(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return Math.round(amount);
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    return NextResponse.json({ rates: await serializeRates() });
  } catch (error) {
    console.error("Failed to load cost rates:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des prix au m2" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    for (const category of CATEGORIES) {
      const amount = parseAmount(body[category]);

      if (amount === undefined) {
        return NextResponse.json(
          { error: `Le prix au m2 ${category} est invalide` },
          { status: 400 },
        );
      }

      if (amount !== null) {
        await upsertDefaultCostRate(category, amount);
      }
    }

    return NextResponse.json({ rates: await serializeRates() });
  } catch (error) {
    console.error("Failed to save cost rates:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement des prix au m2" },
      { status: 500 },
    );
  }
}
