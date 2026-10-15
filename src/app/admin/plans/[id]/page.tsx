import { getEdgePlanById } from "@/lib/edge-db";
import { parseRooms, parseStringArray } from "@/lib/plan-serialization";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "../plan-form";

export const runtime = "edge";

export default async function EditPlanPage({
  params,
}: {
  params: { id: string };
}) {
  let plan = null;

  try {
    plan = await getEdgePlanById(params.id);
  } catch (error) {
    console.error("Failed to load plan for editing:", error);
  }

  if (!plan) {
    notFound();
  }

  const initialData = {
    ...plan,
    rooms: parseRooms(plan.rooms),
    images: parseStringArray(plan.images),
    distributionPlans: parseStringArray(plan.distributionPlans),
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/plans"
          aria-label="Retour aux plans"
          className="text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Modifier le plan</h1>
          <p className="text-sm text-foreground/50 mt-1 truncate">{plan.name}</p>
        </div>
      </div>
      <PlanForm mode="edit" planId={plan.id} initialData={initialData} />
    </div>
  );
}
