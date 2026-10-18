import Link from "next/link";
import { CtaCatalogue } from "@/components/CtaCatalogue";
import { Faq, FaqJsonLd } from "@/components/Faq";
import { PlanGrid } from "@/components/PlanCard";
import { Testimonials } from "@/components/Testimonials";
import { CATALOGUE_FAQ } from "@/lib/faq";
import { listPublicPlans } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Explorez les modèles",
    text: "Parcourez gratuitement les villas et duplex : rendus 3D, nombre de chambres, niveaux, surfaces et budget indicatif.",
  },
  {
    title: "Choisissez avec le Catalogue Premium",
    text: "Comparez les distributions cotées et les devis détaillés, sélectionnez vos trois favoris et choisissez la maison qui correspond à votre famille, votre terrain et votre budget.",
  },
  {
    title: "Passez aux plans complets",
    text: "Quand votre choix est fait, nos architectes adaptent le modèle à votre terrain et réalisent le dossier complet, à prix fixe. Le prix du catalogue est déduit : vous payez seulement la différence.",
  },
];

export default async function HomePage() {
  const featured = await listPublicPlans({ limit: 6 });
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: "https://www.wooplans.com",
    logo: "https://www.wooplans.com/apple-touch-icon.png",
    email: SITE.email,
    sameAs: SITE.social.map((s) => s.href),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <FaqJsonLd items={CATALOGUE_FAQ} />

      <section className="relative overflow-hidden bg-primary-dark text-white">
        <picture>
          <source media="(max-width: 640px)" srcSet="/images/hero-home-mobile.webp" />
          <img src="/images/hero-home.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" fetchPriority="high" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/85 to-transparent" />
        <div className="container-page relative py-20 md:py-28">
          <p className="eyebrow text-highlight">Villas et duplex pour l&apos;Afrique francophone</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Choisissez la maison adaptée à votre famille, votre terrain et votre budget
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Plus de 50 modèles avec rendus 3D, distributions cotées et devis estimatifs, pour décider en toute confiance avant de construire.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SITE.catalogueUrl} data-cta="home_hero" className="btn-cta px-8 py-4 text-base">
              {SITE.catalogueCta}
            </Link>
            <Link href="/catalogue" className="btn border border-white/30 px-8 py-4 text-base text-white hover:bg-white/10">
              Explorer les modèles
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Les modèles</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Quelques maisons du catalogue</h2>
          </div>
          <Link href="/catalogue" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
            Tous les modèles →
          </Link>
        </div>
        <PlanGrid plans={featured} />
        <div className="mt-8 text-center sm:hidden">
          <Link href="/catalogue" className="btn-ghost">Tous les modèles</Link>
        </div>
      </section>

      <section className="border-y border-outline bg-surface">
        <div className="container-page py-16">
          <p className="eyebrow text-center">Comment ça marche</p>
          <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight md:text-3xl">De l&apos;idée au bon modèle, en trois étapes</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-background p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 text-center">
          <p className="eyebrow">Témoignages</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Ils ont choisi leur maison avec WOOPLANS</h2>
        </div>
        <Testimonials />
      </section>

      <CtaCatalogue ctaId="home_band" />

      <section className="container-page grid gap-10 py-16 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Questions fréquentes</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Tout savoir avant de commencer</h2>
          <p className="mt-4 text-foreground/70">
            Une autre question ?{" "}
            <Link href="/contact" className="font-semibold text-primary hover:underline">Contactez-nous</Link>.
          </p>
        </div>
        <Faq items={CATALOGUE_FAQ} />
      </section>
    </>
  );
}
