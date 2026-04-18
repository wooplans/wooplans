import { PlanCard } from "./PlanCard";

export type PlanListItem = {
  slug: string;
  name: string;
  category: string;
  thumbnail: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
};

type PlanGridProps = {
  plans: PlanListItem[];
};

export function PlanGrid({ plans }: PlanGridProps) {
  if (plans.length === 0) {
    return (
      <p className="text-center text-foreground/50 py-12">
        Aucun plan trouvé.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard key={plan.slug} {...plan} />
      ))}
    </div>
  );
}
