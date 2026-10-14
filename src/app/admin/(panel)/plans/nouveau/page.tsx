import { PageTitle } from "@/components/admin/ui";
import { PlanForm } from "@/components/admin/PlanForm";
import { createPlan } from "../actions";

export default function NewPlanPage() {
  return (
    <>
      <PageTitle title="Nouveau modèle" />
      <PlanForm action={createPlan} />
    </>
  );
}
