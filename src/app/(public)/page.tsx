import Link from "next/link";
import { listPlans } from "@/lib/db";
import { PlanGrid } from "@/components/PlanGrid";
import { FAQAccordion } from "@/components/FAQAccordion";
import { VideoTestimonials } from "@/components/VideoTestimonials";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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
      "Après votre paiement sécurisé via Chariow, vous recevez immédiatement un code premium à 4 chiffres par email. Connectez-vous avec ce code et accédez à l'intégralité du catalogue.",
  },
];

export default async function HomePage() {
  const featuredPlans = await listPlans({ featured: true, published: true });
  const allPlans = await listPlans({ published: true });

  return (
    <>
      {/* HERO — Full screen on mobile */}
      <section className="relative bg-foreground text-white min-h-[100dvh] md:min-h-0 flex flex-col items-center justify-center px-4 pt-16 pb-20 md:py-28 overflow-hidden">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="mb-6">
            <span className="inline-flex items-center text-xs font-black px-4 py-1.5 bg-accent text-white uppercase tracking-[0.2em] rounded-full">
              Catalogue de plans de construction
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] mb-6 tracking-tight">
            Trouvez le plan idéal
            <span className="text-highlight"> pour votre projet</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
            Villas et duplex conçus pour l&apos;Afrique. Devis estimatifs détaillés, plans de distribution complets, et accompagnement par nos architectes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/plans"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-accent text-white font-bold px-10 py-5 rounded-full border-2 border-accent hover:bg-accent/90 transition-colors text-lg shadow-lg shadow-accent/20"
            >
              Voir les plans
            </Link>
            <a
              href="#comment-ca-marche"
              className="w-full sm:w-auto inline-flex items-center justify-center text-white font-semibold px-10 py-5 rounded-full border-2 border-white/30 hover:bg-white hover:text-foreground transition-colors text-lg"
            >
              Comment ça marche
            </a>
          </div>

          {/* Quick benefits */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
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
          <VideoTestimonials />
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
      <section className="bg-foreground">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
            Prêt à construire ?
          </h2>
          <p className="text-white/60 mb-10 max-w-lg mx-auto leading-relaxed text-lg">
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
              className="inline-flex items-center justify-center text-white font-semibold px-8 py-4 rounded-full border border-white/30 hover:bg-white hover:text-foreground transition-colors text-base"
            >
              Parler sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
