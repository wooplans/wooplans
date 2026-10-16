import Link from "next/link";
import { CATEGORY_LABELS, formatBudgetRange, levelsLabel } from "@/lib/plan-format";
import type { PublicPlan } from "@/lib/plans";

/** Champs affichés sur une carte : seuls ceux-ci sont envoyés au navigateur par le catalogue filtrable. */
export type PlanCardData = Pick<
  PublicPlan,
  "id" | "slug" | "code" | "name" | "category" | "bedrooms" | "bathrooms" | "levels" | "surfaceTotal" | "landArea" | "budgetMin" | "budgetMax" | "coverImage"
>;

export function PlanCard({ plan, priority = false }: { plan: PlanCardData; priority?: boolean }) {
  const budget = formatBudgetRange(plan.budgetMin, plan.budgetMax);
  return (
    <Link
      href={`/catalogue/${plan.slug}`}
      className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-xl hover:shadow-black/5"
    >
      <div className="relative aspect-video overflow-hidden bg-outline/40">
        {plan.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.coverImage}
            alt={`${plan.name} — rendu 3D`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-xs font-semibold text-primary">
          {CATEGORY_LABELS[plan.category]} · {plan.code}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li>{plan.bedrooms} ch.</li>
          <li>{plan.bathrooms} sdb</li>
          <li>{plan.surfaceTotal} m²</li>
          <li>{levelsLabel(plan.levels)}</li>
        </ul>
        {budget ? (
          <p className="mt-4 text-sm">
            <span className="text-muted">Budget indicatif : </span>
            <span className="font-semibold text-foreground">{budget}</span>
          </p>
        ) : null}
        <p className="mt-auto pt-4 text-sm font-semibold text-primary group-hover:underline">Voir le modèle →</p>
      </div>
    </Link>
  );
}

export function PlanGrid({ plans }: { plans: PlanCardData[] }) {
  if (plans.length === 0) {
    return <p className="card p-8 text-center text-muted">Aucun modèle ne correspond à ces critères pour le moment.</p>;
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, i) => (
        <PlanCard key={plan.id} plan={plan} priority={i < 3} />
      ))}
    </div>
  );
}
