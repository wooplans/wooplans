import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Abonnement Premium — WooPlans",
  description:
    "Débloquez l'accès complet aux plans de distribution, devis estimatifs et échanges avec nos architectes. Abonnez-vous à WooPlans Premium.",
  openGraph: {
    title: "Abonnement Premium — WooPlans",
    description:
      "Débloquez l'accès complet aux plans de distribution, devis estimatifs et échanges avec nos architectes.",
  },
};

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
      "Un seul paiement via Chariow, pas d'abonnement récurrent. Votre accès est activé immédiatement après la transaction.",
  },
];

const steps = [
  {
    number: "01",
    title: "Activez votre accès Premium",
    description:
      "Effectuez le paiement sécurisé via Chariow. Votre accès est activé instantanément.",
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
    question: "Comment fonctionne le paiement avec Chariow ?",
    answer:
      "Chariow est une solution de paiement sécurisée adaptée au marché africain. Vous recevez un code premium à 4 chiffres après le paiement qui active immédiatement votre accès Premium.",
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
      <nav className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 text-sm text-foreground/50 font-medium">
          <Link href="/" className="hover:text-primary transition-colors">
            Accueil
          </Link>
          <span>/</span>
          <span className="text-foreground">Abonnement Premium</span>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-16 text-center">
        <span className="inline-flex items-center text-xs font-semibold px-3 py-1 border border-primary/30 text-primary uppercase tracking-[0.2em] mb-4">
          Premium
        </span>
        <h1 className="text-3xl md:text-5xl font-semibold text-foreground leading-tight mb-5 tracking-tight">
          Passez à WooPlans Premium
        </h1>
        <p className="text-lg text-foreground/60 max-w-2xl mx-auto leading-relaxed">
          Débloquez l&apos;accès complet à tous les plans de distribution, devis
          estimatifs et échanges personnalisés avec nos architectes.
        </p>
      </section>

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

       <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-4 tracking-tight">
          Tarification
        </h2>
        <p className="text-foreground/60 text-center mb-12 max-w-xl mx-auto">
          Un seul paiement, pas d&apos;engagement. Accédez immédiatement à tout le catalogue.
        </p>
        <div className="max-w-md mx-auto">
          <div className="relative bg-background border border-outline/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="absolute top-4 right-4 bg-primary text-white text-[11px] font-semibold px-3 py-1 rounded-full">
              POPULAIRE
            </div>
            <div className="p-8 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-1 tracking-tight">
                Accès Premium
              </h3>
              <p className="text-sm text-foreground/50 mb-6">
                12 mois d&apos;accès complet
              </p>
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-semibold text-foreground">
                  29 900
                </span>
                <span className="text-xl font-bold text-foreground/60">
                  FCFA
                </span>
              </div>
              <p className="text-sm text-foreground/40 mb-8">
                Paiement unique &middot; Pas de renouvellement automatique
              </p>

              <button
                onClick={() => window.chariow?.open('prd_9cbatg')}
                className="w-full py-4 bg-primary text-white font-semibold text-lg rounded-full border border-primary hover:bg-primary-dark transition-colors mb-4"
              >
                Passer à Premium — 29 900 FCFA
              </button>

              <div id="chariow-widget"
                data-product-id="prd_9cbatg"
                data-store-domain="wooplans.mychariow.shop"
                data-style="frame"
                data-border-style="sharp"
                data-cta-width="xs"
                data-cta-animation="pulse_glow"
                data-locale="fr"
                data-primary-color="#0F5B59"
                data-background-color="#FFFFFF">
              </div>

              <p className="text-xs text-foreground/40 mt-4">
                Paiement sécurisé via Chariow
              </p>
            </div>
            <div className="border-t border-outline/10 bg-surface/60 px-8 py-6">
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
                      className="w-5 h-5 text-primary shrink-0 mt-0.5"
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

      <section className="border-t border-outline/10 bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-10 tracking-tight">
            Questions fréquentes
          </h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-background border border-outline/10 overflow-hidden rounded-2xl"
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-semibold text-foreground hover:bg-surface/50 transition-colors">
                  <span className="pr-4">{faq.question}</span>
                  <svg
                    className="w-5 h-5 text-foreground/40 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-foreground/60 leading-relaxed border-t border-outline/10 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background border-t border-outline/10">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 tracking-tight">
            Prêt à concrétiser votre projet ?
          </h2>
          <p className="text-foreground/60 mb-8 max-w-lg mx-auto leading-relaxed">
            Rejoignez les nombreux propriétaires qui ont déjà fait confiance à
            WooPlans pour réaliser leur projet de construction en Afrique.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#offres"
              className="px-8 py-4 bg-primary text-white font-semibold text-lg rounded-full border border-primary hover:bg-primary-dark transition-colors"
            >
              Devenir Premium — 29 900 FCFA
            </a>
            <a
              href="https://wa.me/?text=Bonjour, je suis intéressé par l'abonnement Premium WooPlans."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-primary/30 text-primary font-semibold rounded-full hover:border-primary transition-colors"
            >
              En parler sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
