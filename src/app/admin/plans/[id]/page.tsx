import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PlanForm } from "../plan-form";

export const runtime = "edge";

export default async function EditPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
  });

  if (!plan) {
    notFound();
  }

  const initialData = {
    ...plan,
    rooms: JSON.parse(plan.rooms) as { name: string; area: number }[],
    images: JSON.parse(plan.images) as string[],
    distributionPlans: JSON.parse(plan.distributionPlans) as string[],
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
