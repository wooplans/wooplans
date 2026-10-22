import type { Metadata } from "next";
import Link from "next/link";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { Faq, FaqJsonLd } from "@/components/Faq";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { PlanCard } from "@/components/PlanCard";
import { siteUrl } from "@/lib/env";
import type { PlanFilters } from "@/lib/plan-filters";
import { categoryFaq, LANDING_PAGES, landingPagesFor, planStats } from "@/lib/plan-seo";
import { listPublicPlans } from "@/lib/plans";

/** Adresse canonique : /catalogue, /catalogue-villa, /catalogue-duplex (URL héritées du site Framer). */
export function cataloguePath(categorie?: string) {
  return categorie === "villa" || categorie === "duplex" ? `/catalogue-${categorie}` : "/catalogue";
}

/** Titres calés sur les requêtes Google (« plan duplex moderne », « plan de maison duplex », « catalogue villa »). */
const CATALOGUE_SEO = {
  duplex: {
    title: "Plans de duplex modernes 4 et 5 chambres : rendus 3D et budget",
    description:
      "Catalogue de plans de duplex modernes pour l'Afrique : façades en 3D, 4 et 5 chambres, surfaces, terrain conseillé et budget de construction indicatif en FCFA.",
  },
  villa: {
    title: "Catalogue villas : plans de villas modernes plain-pied et budget",
    description:
      "Catalogue de plans de villas modernes de plain-pied pour l'Afrique : 3 et 4 chambres, façades en 3D, surfaces et budget de construction indicatif en FCFA.",
  },
  all: {
    title: "Plans de maisons modernes : villas et duplex avec rendus 3D et budget",
    description:
      "Tous nos plans de maisons modernes pour l'Afrique francophone : villas de plain-pied et duplex, rendus 3D, chambres, surfaces et budget de construction indicatif en FCFA.",
  },
};

export function catalogueMetadata(params: PlanFilters): Metadata {
  const { categorie } = params;
  const seo = categorie === "villa" || categorie === "duplex" ? CATALOGUE_SEO[categorie] : CATALOGUE_SEO.all;
  // Seules les pages « toutes » et « par catégorie » sont indexées ; les combinaisons de filtres ne le sont pas.
  const extraFilters = Object.entries(params).some(([key, value]) => key !== "categorie" && Boolean(value));
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: cataloguePath(categorie) },
    robots: extraFilters ? { index: false, follow: true } : undefined,
  };
}

export async function CatalogueView({ filters }: { filters: PlanFilters }) {
  // Tous les modèles sont rendus ; le filtre s'applique ensuite dans le navigateur, sans aller-retour serveur.
  const plans = await listPublicPlans();
  const items = plans.map((p, i) => ({
    plan: { id: p.id, code: p.code, name: p.name, category: p.category, bedrooms: p.bedrooms, levels: p.levels, budgetMin: p.budgetMin, budgetMax: p.budgetMax, landArea: p.landArea },
    card: <PlanCard plan={p} priority={i < 3} />,
  }));
  const title =
    filters.categorie === "villa" ? "Plans de villas modernes" : filters.categorie === "duplex" ? "Plans de duplex modernes" : "Tous nos plans de maisons modernes";
  const category = filters.categorie === "villa" || filters.categorie === "duplex" ? filters.categorie : null;
  const shown = category ? plans.filter((p) => p.category === category) : plans;
  const themes = category ? landingPagesFor(category) : LANDING_PAGES;
  const faq = category ? categoryFaq(category, planStats(shown)) : [];
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: shown.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/catalogue/${p.slug}`), name: p.name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {faq.length > 0 ? <FaqJsonLd items={faq} /> : null}
      <section className="container-page pb-12 pt-5 md:pt-12">
        <p className="eyebrow hidden md:block">Catalogue WOOPLANS</p>
        <h1 className="text-2xl font-bold tracking-tight md:mt-2 md:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-foreground/70 md:hidden">Rendus 3D, surfaces et budget indicatif de chaque modèle.</p>
        <p className="mt-3 hidden max-w-2xl text-foreground/70 md:block">
          Rendus, chambres, niveaux, surfaces et budget indicatif de chaque modèle. Tous ces modèles sont inclus dans le Catalogue Premium, avec leurs distributions cotées et leurs devis détaillés.
        </p>
        <div className="mt-4 md:mt-8">
          <CatalogueBrowser items={items} initialFilters={filters} />
        </div>
      </section>
      <section className="container-page pb-14">
        <h2 className="text-xl font-semibold md:text-2xl">Trouver le bon plan</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {themes.map((t) => (
            <li key={t.path}>
              <Link href={t.path} className="inline-block rounded-full border border-outline px-4 py-2 text-sm hover:border-primary hover:text-primary">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
        {faq.length > 0 ? (
          <>
            <h2 className="mt-10 text-xl font-semibold md:text-2xl">Questions fréquentes</h2>
            <div className="mt-4 max-w-3xl">
              <Faq items={faq} />
            </div>
          </>
        ) : null}
      </section>
      <CtaCatalogue ctaId="plans_list" />
    </>
  );
}
