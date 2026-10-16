import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { PremiumPlanCard } from "@/components/premium/PremiumPlanCard";
import { requireMember } from "@/lib/auth";
import type { PlanFilters } from "@/lib/plan-filters";
import { listPremiumPlans } from "@/lib/plans";
import { getFavoriteIds, isNewPlan } from "@/lib/premium";

type Props = { searchParams: Promise<PlanFilters> };

export default async function PremiumIndexPage({ searchParams }: Props) {
  const member = await requireMember();
  const filters = await searchParams;
  const [allPlans, favorites] = await Promise.all([listPremiumPlans(), getFavoriteIds(member.id)]);
  const items = allPlans.map((p) => ({
    plan: { id: p.id, code: p.code, name: p.name, category: p.category, bedrooms: p.bedrooms, levels: p.levels, budgetMin: p.budgetMin, budgetMax: p.budgetMax, landArea: p.landArea },
    card: <PremiumPlanCard plan={p} favorite={favorites.has(p.id)} />,
  }));
  const newCount = allPlans.filter((p) => isNewPlan(p.publishedAt)).length;

  return (
    <div className="container-page pb-8 pt-5 md:pt-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Bonjour{member.name ? ` ${member.name.split(" ")[0]}` : ""}, choisissez votre future maison
      </h1>
      <p className="mt-2 text-sm text-foreground/70 md:text-base">
        {allPlans.length} modèles avec distributions cotées et devis détaillés.
        {newCount > 0 ? ` ${newCount} nouveau${newCount > 1 ? "x" : ""} modèle${newCount > 1 ? "s" : ""} récemment.` : ""} Ajoutez vos préférés aux favoris pour les comparer.
      </p>
      <div className="mt-5">
        <CatalogueBrowser items={items} initialFilters={filters} basePath="/espace-premium" search />
      </div>
    </div>
  );
}
