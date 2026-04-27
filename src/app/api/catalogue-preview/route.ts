import { NextResponse } from "next/server";
import { listCataloguePreviewEdgePlans } from "@/lib/edge-db";
import { parseRooms, parseStringArray } from "@/lib/plan-serialization";
import { roundToNearestHundred, isPlanCategory } from "@/lib/cost-estimate";
import { DEFAULT_COST_RATE_VALUES } from "@/lib/cost-rates";

export const runtime = "edge";

function calculateEstimatedPrice(category: string, surface: number): number {
  if (!isPlanCategory(category)) return 0;
  const rate = DEFAULT_COST_RATE_VALUES[category] || 0;
  return roundToNearestHundred(surface * rate);
}

export async function GET() {
  try {
    const plans = await listCataloguePreviewEdgePlans(6);
    return NextResponse.json(
      plans.map((plan) => ({
        slug: plan.slug,
        name: plan.name,
        category: plan.category,
        thumbnail: plan.thumbnail,
        surface: plan.surface,
        bedrooms: plan.bedrooms,
        bathrooms: plan.bathrooms,
        estimatedTotalPrice: calculateEstimatedPrice(plan.category, plan.surface),
        rooms: parseRooms(plan.rooms),
        images: parseStringArray(plan.images),
      })),
    );
  } catch (error) {
    console.error("Failed to load catalogue preview plans:", error);
    return NextResponse.json([], { status: 200 });
  }
}
