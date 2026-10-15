import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PlanForm } from "@/components/admin/PlanForm";
import { PageTitle } from "@/components/admin/ui";
import { deletePlan, updatePlan } from "../actions";

export default async function EditPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const plan = await getDb().query.plans.findFirst({ where: eq(schema.plans.id, id) });
  if (!plan) notFound();
  const { ok } = await searchParams;
  return (
    <>
      <PageTitle
        title={plan.name}
        subtitle={plan.code}
        actions={
          <form action={deletePlan.bind(null, id)}>
            <button className="btn-ghost py-2 text-secondary">Archiver</button>
          </form>
        }
      />
      {ok ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Modèle enregistré ✓</p> : null}
      <PlanForm plan={plan} action={updatePlan.bind(null, id)} />
    </>
  );
}
