import Link from "next/link";
import { PlanCard } from "./PlanCard";
import type { PlanListItem } from "./PlanGrid";

type SimilarPlansProps = {
  plans: PlanListItem[];
  currentSlug: string;
};

export function SimilarPlans({ plans, currentSlug }: SimilarPlansProps) {
  const filtered = plans.filter((p) => p.slug !== currentSlug).slice(0, 3);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Plans similaires
          </h2>
          <p className="text-sm text-foreground/50 mt-1">
            Découvrez d&apos;autres modèles qui pourraient vous intéresser
          </p>
        </div>
        <Link
          href="/plans"
          className="text-sm font-bold text-primary border border-primary/30 px-4 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          Tout voir →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {filtered.map((plan) => (
          <PlanCard key={plan.slug} {...plan} />
        ))}
      </div>
    </section>
  );
}
