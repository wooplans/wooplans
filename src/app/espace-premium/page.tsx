import { PlanFiltersForm } from "@/components/PlanFiltersForm";
import { PremiumPlanCard } from "@/components/premium/PremiumPlanCard";
import { requireMember } from "@/lib/auth";
import { applyPlanFilters, type PlanFilters } from "@/lib/plan-filters";
import { listPremiumPlans } from "@/lib/plans";
import { getFavoriteIds, isNewPlan } from "@/lib/premium";

type Props = { searchParams: Promise<PlanFilters & { q?: string }> };

export default async function PremiumIndexPage({ searchParams }: Props) {
  const member = await requireMember();
  const filters = await searchParams;
  const [allPlans, favorites] = await Promise.all([listPremiumPlans(), getFavoriteIds(member.id)]);
  const q = (filters.q || "").trim().toLowerCase();
  const plans = applyPlanFilters(allPlans, filters).filter(
    (p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  );
  const newCount = allPlans.filter((p) => isNewPlan(p.publishedAt)).length;

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Bonjour{member.name ? ` ${member.name.split(" ")[0]}` : ""}, choisissez votre future maison
      </h1>
      <p className="mt-2 text-foreground/70">
        {allPlans.length} modèles avec distributions cotées et devis détaillés.
        {newCount > 0 ? ` ${newCount} nouveau${newCount > 1 ? "x" : ""} modèle${newCount > 1 ? "s" : ""} récemment.` : ""} Ajoutez vos préférés aux favoris pour les comparer.
      </p>
      <form action="/espace-premium" className="mt-6">
        <input name="q" defaultValue={filters.q} placeholder="Rechercher une référence (ex. V3-037)" className="input" />
      </form>
      <div className="mt-3">
        <PlanFiltersForm filters={filters} action="/espace-premium" />
      </div>
      <p className="mb-5 mt-5 text-sm text-muted">{plans.length} résultat{plans.length > 1 ? "s" : ""}</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PremiumPlanCard key={plan.id} plan={plan} favorite={favorites.has(plan.id)} />
        ))}
      </div>
    </div>
  );
}
