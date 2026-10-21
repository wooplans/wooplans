import type { Metadata } from "next";
import Link from "next/link";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { Faq, FaqJsonLd } from "@/components/Faq";
import { PlanGrid } from "@/components/PlanCard";
import { siteUrl } from "@/lib/env";
import { LANDING_PAGES, landingFaq, landingPage, planImageAlt, planStats, selectLandingPlans } from "@/lib/plan-seo";
import { formatBudgetRange, listPublicPlans } from "@/lib/plans";

/** Page thématique (« plan duplex 4 chambres »…) : une requête Google, une page qui y répond. */
export function landingMetadata(path: string): Metadata {
  const page = landingPage(path);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: { title: page.title, description: page.description },
  };
}

export async function LandingView({ path }: { path: string }) {
  const page = landingPage(path);
  const plans = selectLandingPlans(await listPublicPlans({ category: page.select.category }), page.select);
  const stats = planStats(plans);
  const faq = landingFaq(page, stats);
  const budget = stats.budget ? formatBudgetRange(stats.budget[0], stats.budget[1]) : null;
  const related = LANDING_PAGES.filter((p) => p.path !== page.path);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl("/") },
        { "@type": "ListItem", position: 2, name: page.parent.label, item: siteUrl(page.parent.path) },
        { "@type": "ListItem", position: 3, name: page.h1, item: siteUrl(page.path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: page.h1,
      itemListElement: plans.map((plan, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/catalogue/${plan.slug}`), name: plan.name })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={faq} />
      <section className="container-page pb-12 pt-5 md:pt-12">
        <nav className="mb-4 text-sm text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-primary">Accueil</Link> /{" "}
          <Link href={page.parent.path} className="hover:text-primary">{page.parent.label}</Link> / <span className="text-foreground">{page.label}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{page.h1}</h1>
        <p className="mt-3 max-w-3xl text-foreground/75">{page.intro}</p>
        {stats.count > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-primary/5 px-3 py-1.5 font-medium text-primary">{stats.count} modèle{stats.count > 1 ? "s" : ""}</li>
            {stats.surface ? <li className="rounded-full bg-primary/5 px-3 py-1.5 text-foreground/80">{stats.surface[0]} à {stats.surface[1]} m²</li> : null}
            {budget ? <li className="rounded-full bg-primary/5 px-3 py-1.5 text-foreground/80">Budget indicatif : {budget}</li> : null}
          </ul>
        ) : null}

        <div className="mt-8">
          {page.gallery && plans.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => (
                <Link key={plan.id} href={`/catalogue/${plan.slug}`} className="group card overflow-hidden">
                  <div className="aspect-video overflow-hidden bg-outline/40">
                    {plan.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={plan.coverImage}
                        alt={planImageAlt(plan)}
                        loading={i < 3 ? "eager" : "lazy"}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <p className="p-4 text-sm">
                    <span className="font-semibold">{plan.name}</span>
                    <span className="text-muted"> · {plan.bedrooms} ch. · {plan.surfaceTotal} m²</span>
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <PlanGrid plans={plans} />
          )}
        </div>
      </section>

      <section className="container-page pb-14">
        <h2 className="text-xl font-semibold md:text-2xl">Questions fréquentes</h2>
        <div className="mt-4 max-w-3xl">
          <Faq items={faq} />
        </div>
        <h2 className="mt-12 text-xl font-semibold md:text-2xl">Autres plans de maisons</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {related.map((p) => (
            <li key={p.path}>
              <Link href={p.path} className="inline-block rounded-full border border-outline px-4 py-2 text-sm hover:border-primary hover:text-primary">
                {p.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/catalogue" className="inline-block rounded-full border border-outline px-4 py-2 text-sm hover:border-primary hover:text-primary">
              Tous les modèles
            </Link>
          </li>
        </ul>
      </section>
      <CtaCatalogue ctaId={`landing${page.path.replace(/[/-]/g, "_")}`} />
    </>
  );
}
