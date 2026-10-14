import { listPlans } from "@/lib/db";
import { CatalogueClient } from "@/components/CatalogueClient";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function PlansPage({ searchParams }: { searchParams: { category?: string } }) {
  const plans = (await listPlans({ published: true, ...(["villa", "duplex"].includes(searchParams.category || "") ? { category: searchParams.category } : {}) })).map(plan => ({ ...plan, distributionPlans: [], distributionPlanUrl: "", estimatedCostImage: "" }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-3 tracking-tight">
          Catalogue de plans
        </h1>
        <p className="text-foreground/60">
          {plans.length} plan{plans.length > 1 ? "s" : ""} trouvé{plans.length > 1 ? "s" : ""}
        </p>
      </div>
      <CatalogueClient plans={plans} />
    </div>
  );
}
