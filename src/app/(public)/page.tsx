import type { Metadata } from "next";
import Link from "next/link";
import { listPlans } from "@/lib/db";
import { PlanGrid } from "@/components/PlanGrid";
import { FAQAccordion } from "@/components/FAQAccordion";
import { VideoTestimonials } from "@/components/VideoTestimonials";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const metadata: Metadata = {
  title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
  description:
    "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain. Trouvez le plan idÃ©al pour votre projet.",
  openGraph: {
    title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
    description:
      "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain.",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/images/hero-home.webp",
        width: 1600,
        height: 900,
        alt: "Hero WooPlans avec maquette architecturale et plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
    description:
      "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain.",
    images: ["/images/hero-home.webp"],
  },
};

const homeFaqs = [
  {
    question: "Combien coûte un plan de construction avec WooPlans ?",
    answer:
      "L'accès au catalogue est gratuit. Pour débloquer les plans de distribution HD et les devis détaillés, l'abonnement Premium est à 19 900 FCFA pour 12 mois. Si vous souhaitez des plans complets personnalisés, nos architectes vous établissent un devis sur mesure à partir de 150 000 FCFA.",
  },
  {
    question: "Puis-je modifier un plan du catalogue ?",
    answer:
      "Oui ! Une fois abonné Premium, vous pouvez discuter avec nos architectes sur WhatsApp pour adapter n'importe quel modèle à votre terrain et à vos besoins spécifiques.",
  },
  {
    question: "Le devis estimatif est-il fiable ?",
    answer:
      "Nos devis sont basés sur des ratios professionnels et des tarifs au m² actualisés pour le marché africain. Ils constituent une estimation fiable à +/- 15% selon la qualité des matériaux et la localisation.",
  },
  {
    question: "Comment ça marche après le paiement ?",
    answer:
      "Après votre paiement sécurisé par Mobile Money, vous recevez immédiatement un code premium à 4 chiffres par email. Connectez-vous avec ce code et accédez à l'intégralité du catalogue.",
  },
];

export default async function HomePage() {
  const featuredPlans = await listPlans({ featured: true, published: true });
  const allPlans = await listPlans({ published: true });

  return (
    <>
      {/* HERO â€” Full screen on mobile */}
      <section className="relative bg-dark-bg text-dark-text min-h-[calc(100dvh-4rem)] md:min-h-0 px-4 pt-3 pb-4 md:py-28 overflow-hidden">
        {/* Subtle dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 14%, rgba(234, 88, 12, 0.18), transparent 28%), radial-gradient(circle at 15% 82%, rgba(231, 195, 108, 0.10), transparent 20%), radial-gradient(circle at 85% 18%, rgba(255, 255, 255, 0.05), transparent 16%)",
          }}
        />

        <div className="relative mx-auto flex min-h-[calc(100dvh-5.75rem)] max-w-7xl flex-col justify-between gap-3 lg:grid lg:min-h-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="relative z-10 flex h-full flex-col text-center lg:h-auto lg:text-left">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70 backdrop-blur-sm lg:hidden">
              Catalogue premium
            </div>

            <div className="flex flex-1 flex-col justify-start gap-2 lg:flex-none">
              {/* Title */}
              <h1 className="text-[clamp(1.9rem,7.2vw,2.7rem)] sm:text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-[0.96] tracking-[-0.045em]">
                Trouvez le plan idéal
                <span className="block text-highlight">pour votre projet</span>
              </h1>

              {/* Subtitle */}
              <p className="text-[14px] sm:text-base md:text-xl text-white/65 max-w-[20rem] sm:max-w-2xl mx-auto lg:mx-0 leading-5 sm:leading-relaxed mb-0">
                Villas et duplex conçus pour l&apos;Afrique. Devis estimatifs détaillés, plans de distribution complets, et accompagnement par nos architectes.
              </p>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-10">
              <Link
                href="/plans"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-accent/80 bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-accent/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/90 sm:rounded-full sm:px-10 sm:py-5 sm:text-lg"
              >
                Voir les plans
              </Link>
              <a
                href="#comment-ca-marche"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 py-3.5 text-base font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white sm:rounded-full sm:px-10 sm:py-5 sm:text-lg"
              >
                Comment ça marche
              </a>
            </div>

            {/* Quick benefits */}
            <div className="mt-12 hidden flex-wrap items-center justify-center lg:flex lg:justify-start gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {allPlans.length} plans disponibles
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Devis estimatifs inclus
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Architectes certifiés
              </div>
            </div>
          </div>

          <div className="relative order-2 mx-auto flex w-full max-w-[23rem] flex-1 items-center lg:order-none lg:max-w-none lg:flex-none">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-accent/10 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/10 backdrop-blur-md">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/6" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-px rounded-[1.7rem] border border-white/6" aria-hidden="true" />
              <div className="relative aspect-[4/3] max-h-[44vh] md:aspect-[16/10] lg:aspect-[4/3]">
                <picture>
                  <source
                    media="(max-width: 767px)"
                    srcSet="/images/hero-home-mobile.webp"
                    type="image/webp"
                  />
                  <source
                    media="(min-width: 768px)"
                    srcSet="/images/hero-home.webp"
                    type="image/webp"
                  />
                  <img
                    src="/images/hero-home.webp"
                    alt="Aperçu d'un concept architectural premium avec plans et maquette"
                    className="h-full w-full object-cover object-center md:object-[75%_center]"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="order-3 flex w-full justify-center pb-1 lg:hidden">
            <Link
              href="/plans"
              className="inline-flex w-full max-w-[23rem] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-secondary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(234,88,12,0.28)] ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(234,88,12,0.34)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 5l7 7-7 7M5 12h15" />
              </svg>
              Voir les plans
            </Link>
          </div>
        </div>
      </section>
      {/* BARRE DE CONFIANCE */}
      <section className="bg-surface border-b border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-foreground/60">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium">{allPlans.length} plans disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Architectes certifiés</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Devis estimatifs inclus</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-medium">Paiement sécurisé</span>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS POPULAIRES */}
      {featuredPlans.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16 border-b border-outline/10">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
              Plans populaires
            </h2>
            <p className="text-foreground/60 max-w-xl">
              Les modèles les plus consultés par nos visiteurs, avec budget estimé.
            </p>
          </div>
          <PlanGrid plans={featuredPlans} />
          <div className="mt-10 text-center">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center px-8 py-3 border border-accent text-accent font-semibold rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              Voir tout le catalogue
            </Link>
          </div>
        </section>
      )}

      {/* COMMENT CA MARCHE */}
      <section id="comment-ca-marche" className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
              Comment ça marche
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto">
              De l&apos;idée à la construction en 3 étapes simples.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                1. Choisissez votre modèle
              </h3>
              <p className="text-foreground/60 text-sm leading-relaxed">
                Parcourez le catalogue, comparez les plans et trouvez celui qui correspond à votre besoin et votre budget.
              </p>
            </div>
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                2. Débloquez les détails
              </h3>
              <p className="text-foreground/60 text-sm leading-relaxed">
                Abonnez-vous Premium pour voir les plans de distribution, les devis détaillés et discuter avec nos architectes.
              </p>
            </div>
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                3. Commandez vos plans complets
              </h3>
              <p className="text-foreground/60 text-sm leading-relaxed">
                Personnalisez le modèle choisi avec nos architectes sur WhatsApp et recevez vos plans architecturaux complets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TEMOIGNAGES VIDEO */}
      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
              Ils ont construit avec WooPlans
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto">
              Découvrez les témoignages de propriétaires qui ont utilisé nos plans.
            </p>
          </div>
          <VideoTestimonials variant="vertical" />
        </div>
      </section>

      {/* FAQ RAPIDE */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Questions fréquentes
          </h2>
          <p className="text-foreground/60">
            Tout ce que vous devez savoir avant de commencer.
          </p>
        </div>
        <FAQAccordion items={homeFaqs} />
      </section>

      {/* CTA FINAL */}
      <section className="bg-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-semibold text-dark-text mb-4 tracking-tight">
            Prêt à construire ?
          </h2>
          <p className="text-dark-text/60 mb-10 max-w-lg mx-auto leading-relaxed text-lg">
            Trouvez le plan idéal, débloquez les détails et lancez votre projet de construction dès aujourd&apos;hui.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center bg-accent text-white font-semibold px-8 py-4 rounded-full border border-accent hover:bg-accent/90 transition-colors text-base"
            >
              Explorer les plans
            </Link>
            <a
              href="https://wa.me/237694327885?text=Bonjour%20WooPlans,%20j'aimerais%20avoir%20des%20informations%20sur%20vos%20plans."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-dark-text font-semibold px-8 py-4 rounded-full border border-dark-text/30 hover:bg-dark-text hover:text-dark-bg transition-colors text-base"
            >
              Parler sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
