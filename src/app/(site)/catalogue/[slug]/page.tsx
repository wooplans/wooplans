import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { PlanGrid } from "@/components/PlanCard";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanSpecs } from "@/components/PlanSpecs";
import { customPlanOffer, memberBalance } from "@/lib/custom-plans";
import { siteUrl } from "@/lib/env";
import {
  CATEGORY_LABELS,
  formatBudgetRange,
  formatFcfa,
  getPublicPlan,
  getSimilarPublicPlans,
  levelsLabel,
} from "@/lib/plans";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPublicPlan((await params).slug);
  if (!plan) return { title: "Modèle introuvable", robots: { index: false } };
  const title = plan.seoTitle || `${plan.name} : ${CATEGORY_LABELS[plan.category].toLowerCase()} ${plan.bedrooms} chambres, ${plan.surfaceTotal} m²`;
  const description =
    plan.seoDescription ||
    `${plan.name} : ${CATEGORY_LABELS[plan.category].toLowerCase()} ${levelsLabel(plan.levels).toLowerCase()} de ${plan.bedrooms} chambres et ${plan.surfaceTotal} m². Rendus 3D, surfaces et budget de construction indicatif.`;
  return {
    title,
    description,
    alternates: { canonical: `/catalogue/${plan.slug}` },
    openGraph: { title, description, images: plan.coverImage ? [{ url: plan.coverImage }] : undefined },
  };
}

const PREMIUM_CONTENT = [
  "Plans de distribution cotés de tous les modèles",
  "Tableau des pièces et de leurs surfaces",
  "Devis estimatif détaillé par lot (fondation, élévation, etc.)",
];

export default async function PlanPage({ params }: Props) {
  const plan = await getPublicPlan((await params).slug);
  if (!plan) notFound();
  const similar = await getSimilarPublicPlans(plan);
  const budget = formatBudgetRange(plan.budgetMin, plan.budgetMax);
  const offer = customPlanOffer(plan.category);
  const images = [plan.coverImage, ...plan.renders.filter((r) => r !== plan.coverImage)].filter(Boolean);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Modèles", item: siteUrl("/catalogue") },
      { "@type": "ListItem", position: 3, name: plan.name, item: siteUrl(`/catalogue/${plan.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="container-page py-8 md:py-12">
        <nav className="mb-6 text-sm text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-primary">Accueil</Link> /{" "}
          <Link href="/catalogue" className="hover:text-primary">Modèles</Link> / <span className="text-foreground">{plan.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <PlanGallery images={images} alt={plan.name} />

          <div>
            <p className="eyebrow">{CATEGORY_LABELS[plan.category]} · Réf. {plan.code}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{plan.name}</h1>
            {plan.summary ? <p className="mt-3 text-lg text-foreground/75">{plan.summary}</p> : null}

            {budget ? (
              <div className="mt-6 rounded-2xl bg-primary/5 p-5">
                <p className="text-sm text-muted">Budget de construction indicatif</p>
                <p className="mt-1 text-2xl font-bold text-primary">{budget}</p>
                <p className="mt-1 text-xs text-muted">Hors terrain et honoraires. Le devis détaillé par lot est dans le Catalogue Premium.</p>
              </div>
            ) : null}

            <div className="mt-6">
              <PlanSpecs plan={plan} />
            </div>

            <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-5">
              <p className="font-semibold">Ce modèle est inclus dans le Catalogue Premium</p>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
                {PREMIUM_CONTENT.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary" aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={SITE.catalogueUrl} data-cta="plan_detail" data-plan={plan.slug} className="btn-cta mt-5 w-full py-4 text-base">
                {SITE.catalogueCta}
              </Link>
              <p className="mt-2 text-center text-xs text-muted">
                {formatFcfa(cataloguePrice())} · paiement unique · plus de 50 modèles · accès à vie
              </p>
            </div>
          </div>
        </div>

        {plan.description ? (
          <section className="mt-12 max-w-3xl">
            <h2 className="text-xl font-semibold">À propos de ce modèle</h2>
            <div className="prose-wp mt-3">
              {plan.description.split(/\n{2,}/).map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="card relative overflow-hidden p-6">
            <h2 className="text-lg font-semibold">Distribution cotée</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Le plan de chaque niveau avec les cotes et la surface de chaque pièce est réservé aux membres Premium.
            </p>
            <div className="mt-5 grid h-40 place-items-center rounded-xl bg-[repeating-linear-gradient(45deg,#eef2f4,#eef2f4_10px,#e3e9ed_10px,#e3e9ed_20px)] text-sm font-medium text-muted">
              🔒 Réservé au Catalogue Premium
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Plans complets personnalisés</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Ce modèle vous plaît ? Nos architectes l&apos;adaptent à votre terrain et réalisent le dossier complet.
            </p>
            {offer ? (
              <p className="mt-3 text-sm">
                Prix fixe : <strong>{formatFcfa(offer.price)}</strong>. Avec le Catalogue Premium, vous payez seulement{" "}
                <strong className="text-primary">{formatFcfa(memberBalance(offer))}</strong>.
              </p>
            ) : (
              <p className="mt-3 text-sm">Le prix du catalogue est déduit de la commande.</p>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/plans-personnalises" className="btn-ghost">En savoir plus</Link>
              <a
                href={whatsappLink(`Bonjour WOOPLANS, je suis intéressé(e) par le modèle ${plan.code} (${plan.name}).`)}
                target="_blank"
                rel="noopener noreferrer"
                data-whatsapp={`plan_${plan.slug}`}
                className="btn border border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10"
              >
                Poser une question
              </a>
            </div>
          </div>
        </section>

        {similar.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">Modèles similaires</h2>
            <PlanGrid plans={similar} />
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-outline bg-surface/95 p-3 backdrop-blur sm:hidden">
        <Link href={SITE.catalogueUrl} data-cta="plan_sticky" data-plan={plan.slug} className="btn-cta w-full py-3.5">
          {SITE.catalogueCta}
        </Link>
      </div>
      <div className="mt-16">
        <CtaCatalogue ctaId="plan_band" />
      </div>
    </>
  );
}
