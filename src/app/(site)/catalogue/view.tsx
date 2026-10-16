import type { Metadata } from "next";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import type { PlanFilters } from "@/lib/plan-filters";
import { listPublicPlans } from "@/lib/plans";

/** Adresse canonique : /catalogue, /catalogue-villa, /catalogue-duplex (URL héritées du site Framer). */
export function cataloguePath(categorie?: string) {
  return categorie === "villa" || categorie === "duplex" ? `/catalogue-${categorie}` : "/catalogue";
}

export function catalogueMetadata(params: PlanFilters): Metadata {
  const { categorie } = params;
  const label = categorie === "villa" ? "villas" : categorie === "duplex" ? "duplex" : "villas et duplex";
  // Seules les pages « toutes » et « par catégorie » sont indexées ; les combinaisons de filtres ne le sont pas.
  const extraFilters = Object.entries(params).some(([key, value]) => key !== "categorie" && Boolean(value));
  return {
    title: `Plans de ${label} modernes pour l'Afrique`,
    description: `Découvrez nos modèles de ${label} : rendus 3D, chambres, niveaux, surfaces et budget de construction indicatif. Comparez et choisissez votre future maison.`,
    alternates: { canonical: cataloguePath(categorie) },
    robots: extraFilters ? { index: false, follow: true } : undefined,
  };
}

export async function CatalogueView({ filters }: { filters: PlanFilters }) {
  // Tous les modèles sont envoyés (champs des cartes uniquement) : le filtre s'applique ensuite sans aller-retour serveur.
  const plans = (await listPublicPlans()).map((p) => ({
    id: p.id,
    slug: p.slug,
    code: p.code,
    name: p.name,
    category: p.category,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    levels: p.levels,
    surfaceTotal: p.surfaceTotal,
    landArea: p.landArea,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    coverImage: p.coverImage,
  }));
  const title =
    filters.categorie === "villa" ? "Plans de villas" : filters.categorie === "duplex" ? "Plans de duplex" : "Tous nos modèles de maisons";

  return (
    <>
      <section className="container-page pb-12 pt-5 md:pt-12">
        <p className="eyebrow hidden md:block">Catalogue WOOPLANS</p>
        <h1 className="text-2xl font-bold tracking-tight md:mt-2 md:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-foreground/70 md:hidden">Rendus 3D, surfaces et budget indicatif de chaque modèle.</p>
        <p className="mt-3 hidden max-w-2xl text-foreground/70 md:block">
          Rendus, chambres, niveaux, surfaces et budget indicatif de chaque modèle. Tous ces modèles sont inclus dans le Catalogue Premium, avec leurs distributions cotées et leurs devis détaillés.
        </p>
        <div className="mt-4 md:mt-8">
          <CatalogueBrowser plans={plans} initialFilters={filters} />
        </div>
      </section>
      <CtaCatalogue ctaId="plans_list" />
    </>
  );
}
