import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { PlanGrid } from "@/components/PlanCard";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanSpecs } from "@/components/PlanSpecs";
import { Faq, FaqJsonLd } from "@/components/Faq";
import { Testimonials } from "@/components/Testimonials";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { PlanDescription } from "@/components/PlanDescription";
import { GiftPlanButton } from "@/components/GiftPlanButton";
import { PlanDevisButton } from "@/components/PlanDevisButton";
import { LocalAnchor, LocalPriceText } from "@/components/LocalPrice";
import { ProjectOffer, projectFaq, projectStartLink } from "@/components/ProjectOffer";
import { planProductId } from "@/lib/chariow";
import { countPlanDevisDownloads } from "@/lib/plan-devis-stats";
import { customPlanOffer, planGiftEnabled } from "@/lib/custom-plans";
import { getEnv, siteUrl } from "@/lib/env";
import {
  CATEGORY_LABELS,
  countPublishedPlans,
  formatBudgetRange,
  formatFcfa,
  getPublicPlan,
  getSimilarPublicPlans,
  levelsLabel,
  withPlanCount,
} from "@/lib/plans";
import { landingPagesFor, planFallbackDescription, planImageAlt, planSeoDescription, planSeoTitle } from "@/lib/plan-seo";
import { SHARE_IMAGE, shareImagePath } from "@/lib/share-image";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";
import { cataloguePath } from "../view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPublicPlan((await params).slug);
  if (!plan) return { title: "Modèle introuvable", robots: { index: false } };
  // Espaces multiples retirés des titres et descriptions saisis à la main (« Duplex  D4-033 »).
  const tidy = (v: string) => v.replace(/\s+/g, " ").trim();
  const title = tidy(plan.seoTitle || planSeoTitle(plan));
  const description = tidy(plan.seoDescription || planSeoDescription(plan));
  // Vignette JPEG légère (WhatsApp ignore le WebP et les images lourdes) ; couverture d'origine si elle n'est pas dans R2.
  const sharePath = shareImagePath(plan.coverImage);
  const image = sharePath
    ? { url: sharePath, width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, type: "image/jpeg", alt: planImageAlt(plan) }
    : plan.coverImage
      ? { url: plan.coverImage, alt: planImageAlt(plan) }
      : null;
  return {
    title,
    description,
    alternates: { canonical: `/catalogue/${plan.slug}` },
    // openGraph remplace celui du layout racine : type, nom du site et langue sont repris ici.
    openGraph: {
      type: "website",
      locale: SITE.locale,
      siteName: SITE.name,
      url: `/catalogue/${plan.slug}`,
      title,
      description,
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image.url] : undefined },
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
  const [similar, planCount, downloads] = await Promise.all([
    getSimilarPublicPlans(plan),
    countPublishedPlans(),
    countPlanDevisDownloads(),
  ]);
  const budget = formatBudgetRange(plan.budgetMin, plan.budgetMax);
  const offer = customPlanOffer(plan.category);
  // Offre « plan et devis » du modèle, puis plans complets : visible seulement si OFFRE_PROJET = "1" (aperçu), et pour une villa ou un duplex.
  const project = getEnv().OFFRE_PROJET === "1" && offer ? offer : null;
  const faq = project ? projectFaq({ plan, offer: project, planCount }) : null;
  const online = Boolean(project && planProductId());
  const images = [plan.coverImage, ...plan.renders.filter((r) => r !== plan.coverImage)].filter(Boolean);
  const categoryPath = cataloguePath(plan.category);
  const categoryLabel = plan.category === "villa" ? "Villas" : plan.category === "duplex" ? "Duplex" : "Modèles";
  const themes = landingPagesFor(plan.category, plan.bedrooms).filter((p) => !p.select.maxSurface || plan.surfaceTotal <= p.select.maxSurface);
  const description = plan.description || planFallbackDescription(plan);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: categoryLabel, item: siteUrl(categoryPath) },
      { "@type": "ListItem", position: 3, name: plan.name, item: siteUrl(`/catalogue/${plan.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="container-page py-8 md:py-12">
        <nav className="mb-6 text-sm text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-primary">Accueil</Link> /{" "}
          <Link href={categoryPath} className="hover:text-primary">{categoryLabel}</Link> / <span className="text-foreground">{plan.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <PlanGallery images={images} alt={planImageAlt(plan)} />

          <div>
            <p className="eyebrow">{CATEGORY_LABELS[plan.category]} · Réf. {plan.code}</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-4xl">
              {plan.name}
              <span className="mt-1 block text-base font-medium text-foreground/70 md:text-lg">
                Plan de {CATEGORY_LABELS[plan.category].toLowerCase()} moderne {plan.bedrooms} chambres · {plan.surfaceTotal} m² · {levelsLabel(plan.levels)}
              </span>
            </h1>

            {/*
              Ordre de la fiche (visiteurs mobiles venus d'une pub) : la maison, puis tout de suite l'offre.
              Avant : budget, résumé et 7 caractéristiques passaient avant l'offre (carte à ~2,4 écrans, bouton à ~3,3) ;
              5,5 % des visiteurs ouvraient le formulaire (PostHog, 7-9 nov.). Le détail technique vient après.
            */}
            {project ? (
              <ProjectOffer
                plan={plan}
                offer={project}
                planCount={planCount}
                online={online}
                budget={budget}
                downloads={downloads}
              />
            ) : (
            <>
            {budget ? (
              <div className="mt-6 rounded-2xl bg-primary/5 p-5">
                <p className="text-sm text-muted">Budget de construction indicatif</p>
                <p className="mt-1 text-2xl font-bold text-primary">{budget}</p>
                <p className="mt-1 text-xs text-muted">Hors terrain et honoraires. Le devis détaillé par lot est dans le Catalogue Premium.</p>
              </div>
            ) : null}
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
                {formatFcfa(cataloguePrice())} · paiement unique · {withPlanCount(planCount, "modèles", "tous les")} · accès à vie
              </p>
            </div>
            </>
            )}
          </div>
        </div>

        {project ? (
          <section className="mt-12">
            <h2 className="mb-1 text-xl font-semibold">Ils ont choisi leur maison avec WOOPLANS</h2>
            <p className="mb-4 text-sm text-muted">Nos clients en vidéo</p>
            <Testimonials variant="row" source="plan" />
          </section>
        ) : null}

        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 text-xl font-semibold">Caractéristiques</h2>
          <PlanSpecs plan={plan} />
          {budget ? (
            <p className="mt-3 text-sm text-foreground/75">
              Budget de construction indicatif : <strong className="text-foreground">{budget}</strong> (hors terrain et honoraires).
            </p>
          ) : null}
        </section>

        {faq ? (
          <section className="mt-12 max-w-3xl">
            <h2 className="mb-4 text-xl font-semibold">Questions fréquentes</h2>
            <Faq items={faq} />
            <FaqJsonLd items={faq} />
          </section>
        ) : null}

        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-semibold">À propos de ce modèle</h2>
          {plan.summary ? <p className="mt-3 leading-relaxed text-foreground/80">{plan.summary}</p> : null}
          <PlanDescription description={description} />
          {themes.length > 0 ? (
            <p className="mt-4 text-sm text-foreground/75">
              Voir aussi :{" "}
              {themes.map((t, i) => (
                <span key={t.path}>
                  {i > 0 ? " · " : null}
                  <Link href={t.path} className="font-medium text-primary hover:underline">{t.h1.replace(/^./, (c) => c.toLowerCase())}</Link>
                </span>
              ))}
            </p>
          ) : null}
        </section>

        {faq ? null : (
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
                Prix fixe : <strong className="text-primary">{formatFcfa(offer.price)}</strong>.
              </p>
            ) : (
              <p className="mt-3 text-sm">Prix fixe.</p>
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
        )}

        {similar.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">Modèles similaires</h2>
            <PlanGrid plans={similar} eagerFirst={0} />
          </section>
        ) : null}
      </div>

      <StickyOfferBar>
        {project && planGiftEnabled() ? (
          <GiftPlanButton plan={plan} label="Recevoir gratuitement le plan et devis" ctaId="plan_cadeau_sticky" className="btn-cta w-full py-3.5" />
        ) : project ? (
          <>
            {/* Prix au-dessus du bouton : un bouton d'une seule ligne, plus net sur mobile. */}
            <p className="mb-1.5 flex items-baseline justify-center gap-2 whitespace-nowrap text-center leading-tight">
              <LocalAnchor className="text-sm font-medium text-foreground/50" />
              <span className="text-lg font-bold">
                <LocalPriceText part="amount" /> <span className="text-sm font-medium"><LocalPriceText part="currency" /></span>
              </span>
            </p>
            <div className="cta-pulse">
              <PlanDevisButton
                plan={plan}
                label="Recevoir mon plan et devis"
                ctaId="plan_projet_sticky"
                className="btn-cta w-full py-3 text-base"
                fallbackHref={online ? undefined : projectStartLink(plan)}
              />
            </div>
          </>
        ) : (
          <Link href={SITE.catalogueUrl} data-cta="plan_sticky" data-plan={plan.slug} className="btn-cta w-full py-3.5">
            {SITE.catalogueCta}
          </Link>
        )}
      </StickyOfferBar>
      {/* Offre à l'unité : la fiche est la page de vente du modèle, sans bandeau du catalogue en bas. */}
      {project && !planGiftEnabled() ? null : (
        <div className="mt-16">
          <CtaCatalogue ctaId="plan_band" title={project ? "Vous hésitez encore entre plusieurs modèles ?" : undefined} />
        </div>
      )}
    </>
  );
}
