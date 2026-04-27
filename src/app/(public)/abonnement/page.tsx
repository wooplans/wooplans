import Link from "next/link";
import { PricingComparison } from "@/components/PricingComparison";
import { VideoTestimonials } from "@/components/VideoTestimonials";
import { FAQAccordion } from "@/components/FAQAccordion";

const features = [
  {
    title: "Plans de distribution détaillés",
    description:
      "Visualisez le plan architectural complet de chaque modèle avec cotations et dimensions précises de chaque pièce.",
  },
  {
    title: "Devis estimatifs complets",
    description:
      "Accédez au budget prévisionnel ventilé par poste : fondation, gros œuvre, finitions, toiture et plus.",
  },
  {
    title: "Échanges avec nos architectes",
    description:
      "Discutez directement avec nos architectes sur WhatsApp pour personnaliser le plan choisi selon vos besoins.",
  },
  {
    title: "Vues 3D haute définition",
    description:
      "Explorez chaque plan sous tous les angles avec nos visualisations 3D détaillées pour mieux projeter votre futur logement.",
  },
  {
    title: "Accès illimité pendant 12 mois",
    description:
      "Consultez tous les plans du catalogue sans restriction pendant une année entière, y compris les nouveaux modèles ajoutés.",
  },
  {
    title: "Paiement unique et sécurisé",
    description:
      "Un seul paiement par Mobile Money, pas d'abonnement récurrent. Votre accès est activé immédiatement après la transaction.",
  },
];

const steps = [
  {
    number: "01",
    title: "Activez votre accès Premium",
    description:
      "Effectuez le paiement sécurisé par Mobile Money. Votre accès est activé instantanément.",
  },
  {
    number: "02",
    title: "Recevez votre code premium",
    description:
      "Après le paiement, vous recevez un code premium à 4 chiffres pour vous connecter.",
  },
  {
    number: "03",
    title: "Explorez le catalogue en entier",
    description:
      "Parcourez tous les plans avec les distributions, cotations et estimations budgétaires débloqués.",
  },
];

const faqs = [
  {
    question: "Que contient exactement l'abonnement Premium ?",
    answer:
      "L'abonnement Premium vous donne accès aux plans de distribution détaillés avec cotations, aux devis estimatifs complets ventilés par poste de dépenses, aux vues 3D haute définition et à la possibilité d'échanger avec nos architectes sur WhatsApp pour personnaliser votre plan.",
  },
  {
    question: "Combien de temps dure l'accès Premium ?",
    answer:
      "L'accès Premium est valable 12 mois à compter de la date d'activation. Pendant cette période, vous consultez tous les plans du catalogue sans restriction, y compris les nouveaux modèles ajoutés.",
  },
  {
    question: "Est-ce un abonnement mensuel ou un paiement unique ?",
    answer:
      "C'est un paiement unique. Il n'y a pas de renouvellement automatique. Vous payez une seule fois et profitez de l'accès complet pendant 12 mois.",
  },
  {
    question: "Comment fonctionne le paiement par Mobile Money ?",
    answer:
      "Le paiement par Mobile Money est simple et sécurisé. Vous recevez un code premium à 4 chiffres après le paiement qui active immédiatement votre accès Premium.",
  },
  {
    question: "Puis-je obtenir un remboursement ?",
    answer:
      "Si vous n'êtes pas satisfait dans les 7 premiers jours suivant votre achat, vous pouvez nous contacter pour demander un remboursement intégral.",
  },
  {
    question: "Comment contacter un architecte après mon abonnement ?",
    answer:
      "Une fois Premium, un bouton WhatsApp apparaît sur chaque fiche plan vous permettant de démarrer une conversation directe avec notre équipe d'architectes.",
  },
];

export default function AbonnementPage() {
  return (
    <>
      {/* HERO — Plein écran sur mobile, percutant */}
      <section className="relative bg-dark-bg text-dark-text min-h-[100dvh] md:min-h-0 flex flex-col items-center justify-center px-4 pt-16 pb-20 md:py-24 overflow-hidden">
        {/* Motif subtil en arrière-plan */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge offre */}
          <div className="mb-6">
            <span className="inline-flex items-center text-xs font-black px-4 py-1.5 bg-secondary text-white uppercase tracking-[0.2em] rounded-full">
              Offre de lancement
            </span>
          </div>

          {/* Titre */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] mb-6 tracking-tight">
            Construisez en sachant
            <span className="text-accent"> exactement</span> où vous allez
          </h1>

          {/* Sous-titre */}
          <p className="text-lg md:text-xl text-dark-text/60 max-w-xl mx-auto leading-relaxed mb-10">
            Débloquez les plans de distribution HD, les devis estimatifs complets et discutez avec nos architectes pour personnaliser votre projet.
          </p>

          {/* Prix */}
          <div className="mb-8">
            <div className="flex items-baseline justify-center gap-3 mb-2">
              <span className="text-6xl md:text-7xl font-semibold text-white">
                19 900
              </span>
              <span className="text-2xl md:text-3xl font-bold text-white/60">
                FCFA
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-secondary line-through">
                50 000 FCFA
              </span>
              <span className="text-sm font-bold text-highlight bg-highlight/20 px-3 py-1 rounded-full">
                Économisez 60%
              </span>
            </div>
            <p className="text-sm text-white/40 mt-2">
              Paiement unique · 12 mois d&apos;accès · Pas de renouvellement automatique
            </p>
          </div>

          {/* Garantie */}
          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-white/70">
            <svg className="w-4 h-4 text-highlight shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Garantie satisfait ou remboursé sous 7 jours
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#abonnement"
              className="w-full sm:w-auto px-10 py-5 bg-accent text-white font-bold text-lg rounded-full border-2 border-accent hover:bg-accent/90 hover:border-accent/90 transition-colors shadow-lg shadow-accent/25 text-center"
            >
              Découvrir l&apos;abonnement Premium
            </Link>
            <a
              href="https://wa.me/237694327885?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20l'abonnement%20Premium%20WooPlans."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-10 py-5 border-2 border-dark-text/30 text-dark-text font-semibold text-lg rounded-full hover:bg-dark-text hover:text-dark-bg transition-colors text-center"
            >
              Une question ? WhatsApp
            </a>
          </div>

          {/* Avantages rapides */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-dark-text/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Plans HD
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Devis complets
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Architectes disponibles
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb repositionné sous la hero */}
      <nav className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-foreground/40 font-medium">
          <Link href="/" className="hover:text-primary transition-colors">
            Accueil
          </Link>
          <span>/</span>
          <span className="text-foreground/60">Abonnement Premium</span>
        </div>
      </nav>

      <section className="border-y border-outline/10 bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12 tracking-tight">
            Tout ce que vous obtenez avec Premium
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-background p-6 border border-outline/10 rounded-2xl"
              >
                <div className="w-10 h-10 border border-primary/40 text-primary flex items-center justify-center mb-4 text-base font-semibold rounded-full">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground text-base mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING CARD — Fond sombre pour maximum contraste */}
      <section id="abonnement" className="bg-dark-bg py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-dark-text text-center mb-4 tracking-tight">
            Tarification
          </h2>
          <p className="text-dark-text/60 text-center mb-12 max-w-xl mx-auto">
            Un seul paiement, pas d&apos;engagement. Accédez immédiatement à tout le catalogue.
          </p>
          <div className="max-w-md mx-auto">
            {/* Carte blanche qui contraste fortement sur le fond sombre */}
            <div className="relative bg-surface border-2 border-accent rounded-2xl overflow-hidden shadow-2xl shadow-accent/20">
              <div className="absolute top-4 right-4 bg-secondary text-white text-[11px] font-black uppercase tracking-wide px-3 py-1 rounded-full">
                Offre de lancement
              </div>
              <div className="p-8 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-1 tracking-tight">
                  Accès Premium
                </h3>
                <p className="text-sm text-foreground/50 mb-6">
                  12 mois d&apos;accès complet
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-5xl font-semibold text-foreground">
                    19 900
                  </span>
                  <span className="text-xl font-bold text-foreground/60">
                    FCFA
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-base text-secondary line-through">
                    50 000 FCFA
                  </span>
                  <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                    Économisez 60%
                  </span>
                </div>
                <p className="text-sm text-foreground/40 mb-8">
                  Paiement unique &middot; Pas de renouvellement automatique
                </p>

                <div className="flex items-center justify-center gap-2 mb-6 text-sm text-primary bg-primary/5 border border-primary/20 rounded-full px-4 py-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Garantie satisfait ou remboursé sous 7 jours
                </div>

                <Link
                  href="#abonnement"
                  className="block w-full py-4 bg-accent text-white font-bold text-lg rounded-full border-2 border-accent hover:bg-accent/90 transition-colors mb-4 shadow-lg shadow-accent/25 text-center"
                >
                  Découvrir l&apos;abonnement Premium
                </Link>

                <p className="text-xs text-foreground/40 mt-4">
                  Paiement sécurisé par Mobile Money
                </p>
              </div>
              <div className="border-t border-outline/10 bg-background px-8 py-6">
                <ul className="space-y-3">
                  {[
                    "Plans de distribution détaillés",
                    "Devis estimatifs complets",
                    "Vues 3D haute définition",
                    "Échanges architectes sur WhatsApp",
                    "Tous les plans du catalogue",
                    "Nouveaux modèles inclus",
                    "Garantie satisfait ou remboursé 7 jours",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <svg
                        className="w-5 h-5 text-accent shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-foreground/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-outline/10 bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-4 tracking-tight">
            Gratuit vs Premium
          </h2>
          <p className="text-foreground/60 text-center mb-10 max-w-xl mx-auto">
            Comparez les avantages et choisissez la formule qui vous convient.
          </p>
          <PricingComparison />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-4 tracking-tight">
          Ils ont construit avec WooPlans
        </h2>
        <p className="text-foreground/60 text-center mb-10 max-w-xl mx-auto">
          Découvrez les témoignages de propriétaires qui ont utilisé nos plans.
        </p>
        <VideoTestimonials />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12 tracking-tight">
          Comment ça marche
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="text-center p-8 border border-outline/10 rounded-2xl bg-background">
              <div className="w-12 h-12 bg-primary text-white text-lg font-semibold flex items-center justify-center mx-auto mb-5 rounded-full">
                {step.number}
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center px-8 py-3 border border-primary text-primary font-semibold rounded-full hover:bg-primary hover:text-white transition-colors"
          >
            Explorer le catalogue de plans
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Questions fréquentes
          </h2>
          <p className="text-foreground/60">
            Tout ce que vous devez savoir sur l&apos;abonnement Premium.
          </p>
        </div>
        <FAQAccordion items={faqs} />
      </section>

      <section className="bg-dark-bg">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-dark-text mb-4 tracking-tight">
            Prêt à concrétiser votre projet ?
          </h2>
          <p className="text-dark-text/60 mb-8 max-w-lg mx-auto leading-relaxed">
            Rejoignez les nombreux propriétaires qui ont déjà fait confiance à
            WooPlans pour réaliser leur projet de construction en Afrique.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#abonnement"
              className="px-8 py-4 bg-accent text-white font-semibold text-lg rounded-full border border-accent hover:bg-accent/90 transition-colors"
            >
              Découvrir l&apos;abonnement Premium
            </Link>
            <a
              href="https://wa.me/237694327885?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20l'abonnement%20Premium%20WooPlans."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-dark-text/30 text-dark-text font-semibold rounded-full hover:bg-dark-text hover:text-dark-bg transition-colors"
            >
              En parler sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}