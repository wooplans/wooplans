import { PageTitle } from "@/components/admin/ui";
import { PlanForm } from "@/components/admin/PlanForm";
import { getCostSettings } from "@/lib/settings";
import { createPlan } from "../actions";

export default async function NewPlanPage() {
  return (
    <>
      <PageTitle title="Nouveau modèle" />
      <PlanForm action={createPlan} cost={await getCostSettings()} />
    </>
  );
}
