"use client";

import { FAQAccordion } from "@/components/FAQAccordion";
import { VideoTestimonials } from "@/components/VideoTestimonials";
import { demoPlans } from "@/lib/demo-plans";
import Image from "next/image";
import { useEffect, useState } from "react";

const CHECKOUT_URL = "https://wooplans.mychariow.shop/cataloguepupsell";
const HERO_MOCKUP_IMAGE = "/images/premium-catalogue-mockup.png";
const WHATSAPP_URL =
  "https://wa.me/237694327885?text=Bonjour%2C%20j'ai%20une%20question%20sur%20le%20Catalogue%20Premium%20WooPlans.";

const trustPoints = [
  "Mobile Money ou carte",
  "Satisfait ou remboursé",
];

const problems = [
  {
    title: "Vous cherchez des idées, mais rien ne vous rassure vraiment",
    desc: "Vous voyez passer des maisons sur Facebook, TikTok ou WhatsApp, mais il est difficile de savoir quel modèle peut correspondre à votre terrain, votre famille et votre budget.",
  },
  {
    title: "Les devis trouvés sur les réseaux sociaux ne sont pas fiables",
    desc: "Un technicien annonce un prix, un autre donne un montant différent. Vous avez peur de commencer avec un faux budget et de rester bloqué en plein chantier.",
  },
  {
    title: "Vous sentez la pression avant même de poser la première pierre",
    desc: "Construire coûte cher. Sans plan clair ni estimation crédible, chaque décision devient stressante : et si vous choisissiez le mauvais modèle ?",
  },
];

const benefits = [
  {
    title: "Plans de distribution détaillés",
    desc: "Consultez les plans avec cotations, surfaces et dimensions pour comprendre chaque pièce avant de vous engager.",
  },
  {
    title: "Devis estimatifs par poste",
    desc: "Visualisez les grands postes de dépenses : fondation, élévation, toiture, finitions, électricité et plomberie.",
  },
  {
    title: "Vues 3D pour mieux vous projeter",
    desc: "Comparez les modèles avec une vision plus concrète de la maison finale, pas seulement une description.",
  },
  {
    title: "Nouveaux plans inclus",
    desc: "Le catalogue évolue avec de nouveaux modèles. Vous pouvez revenir comparer quand votre projet avance.",
  },
  {
    title: "Accompagnement sur WhatsApp",
    desc: "Si vous hésitez sur un modèle, vous pouvez échanger avec l'équipe pour mieux adapter votre choix à votre terrain.",
  },
  {
    title: "Accès simple après paiement",
    desc: "Après l'achat, vous recevez les instructions et votre code d'accès pour consulter le catalogue Premium.",
  },
];

const offerFeatures = [
  {
    label: "Plans de distribution et cotations",
    value: "45 000 FCFA",
  },
  {
    label: "Devis de la fondation aux finitions",
    value: "50 000 FCFA",
  },
  {
    label: "Vues 3D des modèles disponibles",
    value: "35 000 FCFA",
  },
  {
    label: "+50 plans de villas et duplex",
    value: "50 000 FCFA",
  },
  {
    label: "Assistance WhatsApp",
    value: "20 000 FCFA",
  },
];

type CataloguePreviewPlan = {
  slug: string;
  name: string;
  category: string;
  thumbnail: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  estimatedTotalPrice: number;
};

const fallbackCatalogPreviewPlans: CataloguePreviewPlan[] = demoPlans
  .filter((plan) => plan.published)
  .slice(0, 6)
  .map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    category: plan.category === "duplex" ? "Duplex" : "Villa",
    thumbnail: plan.thumbnail,
    surface: plan.surface,
    bedrooms: plan.bedrooms,
    bathrooms: plan.bathrooms,
    estimatedTotalPrice: plan.estimatedTotalPrice,
  }));

const steps = [
  {
    number: "01",
    title: "Cliquez sur Obtenir Premium",
    desc: "Vous êtes redirigé vers la page de paiement pour entrer vos informations.",
  },
  {
    number: "02",
    title: "Payez votre accès",
    desc: "Payez 29 000 FCFA en une seule fois, par Mobile Money ou carte selon les options disponibles.",
  },
  {
    number: "03",
    title: "Recevez votre catalogue",
    desc: "Après validation, vous recevez immédiatement un code pour accéder aux plans et devis du Catalogue Premium.",
  },
];

const faqs = [
  {
    question: "Qu'est-ce que je reçois avec le Catalogue Premium ?",
    answer:
      "Vous accédez aux plans de distribution, aux devis estimatifs, aux vues 3D disponibles, aux nouveaux modèles inclus et à l'accompagnement WooPlans sur WhatsApp.",
  },
  {
    question: "Le paiement est-il mensuel ?",
    answer:
      "Non. L'offre est présentée comme un paiement unique de 29 000 FCFA. Il n'y a pas de renouvellement automatique depuis cette page.",
  },
  {
    question: "Comment vais-je recevoir mon accès ?",
    answer:
      "Après le paiement par Mobile Money, vous recevez les instructions d'accès et le code Premium par WhatsApp et email.",
  },
  {
    question: "Puis-je payer par Mobile Money ?",
    answer:
      "Oui. La page de paiement prend en charge les moyens de paiement par Mobile Money.",
  },
  {
    question: "Et si je ne suis pas satisfait ?",
    answer:
      "WooPlans met en avant une garantie satisfait ou remboursé de 7 jours. Si vous avez un souci, contactez rapidement l'équipe sur WhatsApp avec les détails de votre achat.",
  },
  {
    question: "Puis-je poser une question avant d'acheter ?",
    answer: (
      <>
        Oui.{" "}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent underline underline-offset-4"
        >
          Cliquez ici
        </a>{" "}
        pour nous contacter sur WhatsApp et poser directement votre question.
      </>
    ),
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.4} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

function CheckoutButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-center text-base font-bold text-white shadow-xl shadow-accent/25 transition-colors hover:bg-accent/90 ${className}`}
    >
      {children}
    </a>
  );
}

export default function AbonnementFacebookFroidPage() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [catalogPreviewPlans, setCatalogPreviewPlans] = useState<CataloguePreviewPlan[]>(
    fallbackCatalogPreviewPlans,
  );
  const remainingCatalogPlans = Math.max(50 - catalogPreviewPlans.length, 0);

  useEffect(() => {
    const solutionSection = document.getElementById("solution");
    if (!solutionSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCta(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { threshold: 0.08 },
    );

    observer.observe(solutionSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/catalogue-preview")
      .then((res) => (res.ok ? res.json() : []))
      .then((value: unknown) => {
        if (!cancelled && Array.isArray(value) && value.length > 0) {
          const plans = value as CataloguePreviewPlan[];
          setCatalogPreviewPlans(
            plans.map((plan) => ({
              ...plan,
              category: plan.category === "duplex" ? "Duplex" : "Villa",
            })),
          );
        }
      })
      .catch(() => {
        // Keep the demo preview if the admin-backed endpoint is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <main className="overflow-hidden pb-24 md:pb-0">
        <section className="relative bg-dark-bg text-dark-text">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, white 1px, transparent 1px), radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
              backgroundSize: "42px 42px, 28px 28px",
            }}
          />
          <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center gap-6 px-4 py-10 text-center md:grid md:min-h-0 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:py-20 md:text-left">
            <div className="md:order-1">
              <h1 className="mb-4 text-3xl font-semibold leading-[1.05] tracking-tight text-white sm:text-4xl md:mb-6 md:text-6xl">
                Avant de construire, sachez combien votre maison peut vraiment coûter
              </h1>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-white/65 md:mx-0 md:mb-8 md:text-xl">
                Obtenez le Catalogue Premium avec plus de 50 plans de villas et duplex pour voir les plans de distribution, les devis estimatifs et les vues 3D avant de choisir un modèle avec plus de clarté, avant de dépenser des millions sur le chantier.
              </p>
              <div className="hidden flex-col gap-3 sm:flex-row md:mb-8 md:flex">
                <CheckoutButton className="w-full sm:w-auto">
                  Obtenir le Catalogue - 29 000 FCFA
                </CheckoutButton>
              </div>
              <div className="hidden grid-cols-2 gap-3 text-sm text-white/55 sm:flex-wrap md:flex">
                {trustPoints.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-highlight" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-full md:order-2">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur">
                <Image
                  src={HERO_MOCKUP_IMAGE}
                  alt="Mockup du Catalogue Premium WooPlans sur ordinateur et smartphone"
                  width={1400}
                  height={788}
                  priority
                  className="h-auto w-full rounded-[1.5rem] object-cover"
                />
              </div>
            </div>

            <div className="w-full md:hidden">
              <div className="mb-3 flex items-center justify-center gap-3">
                <span className="text-sm font-semibold text-white/45 line-through">
                  60 000 FCFA
                </span>
                <span className="rounded-full bg-highlight/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-highlight">
                  Offre de lancement
                </span>
              </div>
              <CheckoutButton className="w-full">
                Obtenir le Catalogue - 29 000 FCFA
              </CheckoutButton>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/55">
                {trustPoints.map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckIcon className="h-3.5 w-3.5 text-highlight" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-outline/10 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-18">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
                Le problème
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Vous voulez construire, mais vous ne savez pas encore par où commencer
              </h2>
              <p className="mt-4 text-base leading-relaxed text-foreground/60 md:text-lg">
                Entre les photos qui donnent envie, les plans incomplets et les devis approximatifs partagés sur les réseaux sociaux, il est normal d&apos;hésiter. Vous avez besoin d&apos;inspiration, mais aussi de chiffres et de plans plus sérieux pour avancer sans stress.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {problems.map((problem) => (
                <article key={problem.title} className="rounded-2xl border border-outline/10 bg-background p-6">
                  <div className="mb-4 h-1.5 w-12 rounded-full bg-accent" />
                  <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                    {problem.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/60">{problem.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
              La solution
            </p>
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Un catalogue de plans de villas et duplex pour votre inspiration
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-outline/10 bg-surface p-6 transition-colors hover:border-primary/25"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/60">{benefit.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-outline/10 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mb-10 grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Aperçu du catalogue
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Quelques modèles que vous allez découvrir dans le Catalogue Premium
                </h2>
              </div>
              <p className="text-foreground/60 md:text-lg">
                Plus de 50 plans modernes de villas et duplex
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalogPreviewPlans.map((plan) => (
                <article
                  key={plan.slug}
                  className="group overflow-hidden rounded-2xl border border-outline/10 bg-background"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                    <Image
                      src={plan.thumbnail}
                      alt={plan.name}
                      width={800}
                      height={600}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      quality={55}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-dark-bg/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                      {plan.category}
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-full bg-accent px-3 py-1 text-[11px] font-black text-white shadow-lg">
                      Inclus Premium
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                      {plan.name}
                    </h3>
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-foreground/55">
                      <span>{plan.surface} m²</span>
                      <span className="text-foreground/25">/</span>
                      <span>{plan.bedrooms} chambres</span>
                      <span className="text-foreground/25">/</span>
                      <span>{plan.bathrooms} SdB</span>
                    </div>
                    <div className="rounded-xl bg-surface px-4 py-3">
                      <p className="text-xs text-foreground/45">Budget estimé du projet</p>
                      <p className="text-sm font-bold text-accent">
                        À partir de {formatPrice(plan.estimatedTotalPrice)} FCFA
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              <article className="relative flex min-h-[360px] overflow-hidden rounded-2xl border border-accent/25 bg-dark-bg p-6 text-white shadow-xl shadow-accent/10">
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "22px 22px",
                  }}
                />
                <div className="relative flex w-full flex-col items-center justify-center text-center">
                  <div className="mb-5 rounded-full bg-highlight/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-highlight">
                    Catalogue complet
                  </div>
                  <div className="mb-3 text-6xl font-black tracking-tight text-white">
                    +{remainingCatalogPlans}
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold tracking-tight">
                    autres plans à découvrir
                  </h3>
                  <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/60">
                    Villas, duplex, maisons familiales et nouveaux modèles ajoutés pour comparer plus d&apos;options avant de choisir.
                  </p>
                  <CheckoutButton className="w-full px-6 py-3 text-sm sm:w-auto">
                    Obtenir le Catalogue
                  </CheckoutButton>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-dark-bg py-16 text-dark-text md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-highlight">
                  Témoignages vidéos
                </p>
                <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Ils ont déjà découvert le Catalogue Premium
                </h2>
                <p className="mb-6 text-white/60">
                  Regardez les retours de personnes qui ont utilisé WooPlans pour mieux préparer leur projet de construction.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <VideoTestimonials variant="vertical" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-outline/10 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">
                Comment ça marche ?
              </h2>
              <p className="mx-auto max-w-xl text-foreground/60">
                Obtenez le Catalogue en moins de 2 min
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-outline/10 bg-background p-7 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-black text-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/60">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-dark-bg py-16 md:py-24" id="offre">
          <div className="mx-auto max-w-3xl px-4">
            <div className="rounded-[2rem] border-2 border-accent bg-surface p-6 text-center shadow-2xl shadow-accent/20 md:p-10">
              <p className="mb-4 inline-flex rounded-full bg-secondary px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white">
                OFFRE DE LANCEMENT
              </p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Obtenez le Catalogue Premium WooPlans
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-foreground/60">
                Plans, devis estimatifs, vues 3D et accompagnement pour mieux préparer votre projet avant de commencer les dépenses lourdes.
              </p>

              <div className="mb-8 overflow-hidden rounded-3xl border border-outline/10 bg-background text-left">
                <div className="p-5 md:p-6">
                  <p className="mb-4 text-center text-sm font-semibold text-foreground/60">
                    Voici ce que vous recevez aujourd&apos;hui
                  </p>
                  <div className="space-y-3">
                    {offerFeatures.map((feature) => (
                      <div
                        key={feature.label}
                        className="flex items-start justify-between gap-4 border-b border-outline/10 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                          <span className="text-sm font-medium text-foreground/75">
                            {feature.label}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-foreground/45">
                          {feature.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-outline/10 bg-surface p-5 md:p-6">
                  <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground/55">Valeur totale estimée</span>
                    <span className="font-bold text-foreground/70 line-through">
                      200 000 FCFA
                    </span>
                  </div>
                  <div className="mb-5 flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground/55">Prix officiel</span>
                    <span className="font-bold text-secondary line-through">
                      60 000 FCFA
                    </span>
                  </div>
                  <div className="rounded-2xl bg-accent/10 p-4 text-center">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-accent">
                      Prix de lancement
                    </p>
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-5xl font-bold tracking-tight text-foreground">
                        29 000
                      </span>
                      <span className="pb-1 text-lg font-bold text-foreground/60">
                        FCFA
                      </span>
                    </div>
                    <span className="mt-2 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-black text-secondary">
                      Économisez 31 000 FCFA
                    </span>
                  </div>
                </div>
              </div>

              <CheckoutButton className="w-full text-lg md:w-auto">
                Obtenir mon Catalogue Premium
              </CheckoutButton>
              <p className="mt-4 text-xs text-foreground/45">
                Vous serez redirigé vers la page de paiement par Mobile Money
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
              Questions fréquentes
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Avant de passer au paiement
            </h2>
          </div>
          <FAQAccordion items={faqs} />
        </section>

        <section className="bg-dark-bg">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Donnez à votre projet une base plus claire
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-white/60">
              Pour 29 000 FCFA, vous pouvez comparer les plans, consulter les estimations et avancer avec une vision plus précise de votre future maison.
            </p>
            <CheckoutButton className="w-full text-lg sm:w-auto">
              Acheter le Catalogue Premium
            </CheckoutButton>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-dark-bg/95 p-3 shadow-2xl backdrop-blur transition-transform duration-300 md:hidden ${
          showStickyCta ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <CheckoutButton className="w-full py-3 animate-pulse">
          Obtenir le Catalogue - 29 000 FCFA
        </CheckoutButton>
      </div>
    </>
  );
}
