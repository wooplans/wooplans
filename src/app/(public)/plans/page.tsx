import { listPlans } from "@/lib/db";
import { CatalogueClient } from "@/components/CatalogueClient";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function PlansPage() {
  const plans = await listPlans({ published: true });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-8 tracking-tight">
        Catalogue de plans
      </h1>
      <CatalogueClient plans={plans} />
    </div>
  );
}
