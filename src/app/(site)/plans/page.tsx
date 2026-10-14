import type { Metadata } from "next";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { PlanGrid } from "@/components/PlanCard";
import { PlanFiltersForm } from "@/components/PlanFiltersForm";
import { applyPlanFilters, type PlanFilters } from "@/lib/plan-filters";
import { listPublicPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<PlanFilters> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const { categorie } = params;
  const label = categorie === "villa" ? "villas" : categorie === "duplex" ? "duplex" : "villas et duplex";
  // Seules les pages « toutes » et « par catégorie » sont indexées ; les combinaisons de filtres ne le sont pas.
  const extraFilters = Object.entries(params).some(([key, value]) => key !== "categorie" && Boolean(value));
  return {
    title: `Plans de ${label} modernes pour l'Afrique`,
    description: `Découvrez nos modèles de ${label} : rendus 3D, chambres, niveaux, surfaces et budget de construction indicatif. Comparez et choisissez votre future maison.`,
    alternates: { canonical: categorie === "villa" || categorie === "duplex" ? `/plans?categorie=${categorie}` : "/plans" },
    robots: extraFilters ? { index: false, follow: true } : undefined,
  };
}

export default async function PlansPage({ searchParams }: Props) {
  const filters = await searchParams;
  const plans = applyPlanFilters(await listPublicPlans(), filters);
  const title =
    filters.categorie === "villa" ? "Plans de villas" : filters.categorie === "duplex" ? "Plans de duplex" : "Tous nos modèles de maisons";

  return (
    <>
      <section className="container-page py-12">
        <p className="eyebrow">Catalogue WOOPLANS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-foreground/70">
          Rendus, chambres, niveaux, surfaces et budget indicatif de chaque modèle. Tous ces modèles sont inclus dans le Catalogue Premium, avec leurs distributions cotées et leurs devis détaillés.
        </p>
        <div className="mt-8">
          <PlanFiltersForm filters={filters} action="/plans" />
        </div>
        <p className="mb-6 mt-6 text-sm text-muted">{plans.length} modèle{plans.length > 1 ? "s" : ""}</p>
        <PlanGrid plans={plans} />
      </section>
      <CtaCatalogue ctaId="plans_list" />
    </>
  );
}
