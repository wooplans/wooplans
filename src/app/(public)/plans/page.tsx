import { listPlans } from "@/lib/db";
import { CatalogueClient } from "@/components/CatalogueClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PlansPage() {
  const plans = await listPlans({ published: true });

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
