import Link from "next/link";
import { FavoriteButton } from "@/components/premium/FavoriteButton";
import { CATEGORY_LABELS, formatFcfa, levelsLabel, type PlanRow } from "@/lib/plans";
import { isNewPlan } from "@/lib/premium";

export function PremiumPlanCard({ plan, favorite }: { plan: PlanRow; favorite: boolean }) {
  return (
    <Link href={`/espace-premium/plans/${plan.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-outline/40">
        {plan.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plan.coverImage} alt={plan.name} loading="lazy" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute right-3 top-3">
          <FavoriteButton planId={plan.id} initial={favorite} compact />
        </div>
        {isNewPlan(plan.publishedAt) ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">Nouveau</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-primary">{CATEGORY_LABELS[plan.category]} · {plan.code}</p>
        <h3 className="mt-1 font-semibold">{plan.name}</h3>
        <p className="mt-2 text-sm text-muted">
          {plan.bedrooms} ch. · {plan.surfaceTotal} m² · {levelsLabel(plan.levels)}
          {plan.landArea ? ` · terrain ${plan.landArea} m²` : ""}
        </p>
        <p className="mt-auto pt-3 text-sm">
          <span className="text-muted">Devis estimatif : </span>
          <span className="font-semibold">{formatFcfa(plan.estimateTotal ?? plan.budgetMin)}</span>
        </p>
      </div>
    </Link>
  );
}
