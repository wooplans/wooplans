import { NextResponse } from "next/server";
import { listPublicPlans } from "@/lib/plans";

/**
 * Données PUBLIQUES des modèles publiés (celles déjà affichées sur les fiches) pour le générateur du Guide des maisons
 * (scripts/guide/fetch_plans.py). Aucune distribution cotée ni devis par lots.
 */
export async function GET() {
  const plans = await listPublicPlans();
  return NextResponse.json(
    plans.map((p) => ({
      slug: p.slug,
      code: p.code,
      name: p.name,
      category: p.category,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      levels: p.levels,
      surfaceTotal: p.surfaceTotal,
      footprint: p.footprint,
      landArea: p.landArea,
      budgetMin: p.budgetMin,
      budgetMax: p.budgetMax,
      cover: p.coverImage,
    })),
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
