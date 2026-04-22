import { prisma } from "@/lib/prisma";
import { parseRooms, parseStringArray } from "@/lib/plan-serialization";
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
    plan = await prisma.plan.findUnique({
      where: { id: params.id },
    });
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Modifier le plan</h1>
        <p className="text-sm text-foreground/50 mt-1">{plan.name}</p>
      </div>
      <PlanForm mode="edit" planId={plan.id} initialData={initialData} />
    </div>
  );
}
