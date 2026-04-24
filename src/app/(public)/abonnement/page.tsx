"use client";

import Link from "next/link";

const features = [
  {
    title: "Plans complets",
    description:
      "Consultez les plans de distribution détaillés, les surfaces par pièce et les informations techniques de chaque modèle.",
  },
  {
    title: "Devis estimatif",
    description:
      "Accédez au tableau de coût généré automatiquement pour mieux préparer le budget de construction.",
  },
  {
    title: "Décision plus rapide",
    description:
      "Comparez les villas et duplex avec les mêmes repères : surface, pièces, budget, vues 3D et potentiel du terrain.",
  },
  {
    title: "Commande accompagnée",
    description:
      "Une fois votre modèle choisi, vous pouvez commander le dossier complet directement auprès de l'équipe WooPlans.",
  },
];

const steps = [
  "Activez votre accès Premium en une seule fois.",
  "Explorez les informations débloquées sur chaque fiche plan.",
  "Commandez le dossier complet du modèle qui correspond à votre projet.",
];

const included = [
  "Plans de distribution détaillés",
  "Devis estimatifs par rubrique",
  "Vues 3D haute définition",
  "Catalogue complet pendant 12 mois",
  "Nouveaux modèles ajoutés inclus",
  "Lien direct WhatsApp pour commander",
];

const faqs = [
  {
    question: "Que débloque Premium ?",
    answer:
      "Premium débloque les sections réservées des fiches plans : distribution, devis estimatif, vues complémentaires et informations utiles pour comparer les modèles.",
  },
  {
    question: "Le paiement est-il récurrent ?",
    answer:
      "Non. Il s'agit d'un paiement unique pour 12 mois d'accès. Il n'y a pas de renouvellement automatique.",
  },
  {
    question: "Puis-je commander un dossier complet après l'abonnement ?",
    answer:
      "Oui. Sur chaque modèle débloqué, le bouton de commande ouvre WhatsApp avec le nom du plan et le lien de la fiche.",
  },
];

export default function AbonnementPage() {
  return (
    <>
      <section className="bg-secondary text-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-end lg:py-20">
          <div>
            <div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-surface/55">
              <Link href="/" className="hover:text-surface">
                Accueil
              </Link>
              <span>/</span>
              <span className="text-highlight">Premium</span>
            </div>
            <span className="inline-flex rounded-full border border-surface/20 px-4 py-2 text-xs font-black uppercase tracking-[0.26em] text-highlight">
              Accès WooPlans
            </span>
            <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Débloquez les plans avant de choisir votre modèle.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-surface/70">
              Premium transforme le catalogue en outil de décision : plans de
              distribution, devis estimatifs, vues 3D et accès aux informations
              qui permettent de comparer sérieusement chaque maison.
            </p>
          </div>

          <div id="offres" className="rounded-[2rem] bg-surface p-6 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              Offre Premium
            </p>
            <div className="mt-5 flex items-end gap-2">
              <span className="font-display text-5xl leading-none">29 900</span>
              <span className="pb-1 text-lg font-black text-muted">FCFA</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Paiement unique, 12 mois d&apos;accès au catalogue complet.
            </p>
            <button
              onClick={() => window.chariow?.open("prd_9cbatg")}
              className="mt-7 w-full rounded-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_36px_rgba(184,106,60,0.28)] transition-colors hover:bg-primary-dark"
            >
              Passer à Premium
            </button>

            <div
              id="chariow-widget"
              data-product-id="prd_9cbatg"
              data-store-domain="wooplans.mychariow.shop"
              data-style="frame"
              data-border-style="rounded"
              data-cta-width="xs"
              data-cta-animation="pulse_glow"
              data-locale="fr"
              data-primary-color="#B86A3C"
              data-background-color="#FFFDF8"
            />

            <div className="mt-7 border-t border-outline/10 pt-6">
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground/75">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-4 md:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-[1.5rem] border border-outline/10 bg-surface p-6 shadow-[0_18px_50px_rgba(30,26,23,0.06)]"
              >
                <span className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                  0{index + 1}
                </span>
                <h2 className="mt-5 font-display text-2xl leading-tight text-foreground">
                  {feature.title}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-outline/10 bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              Parcours simple
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">
              De l&apos;inspiration à la commande, sans friction.
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-5 rounded-[1.25rem] bg-background p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-black text-surface">
                  {index + 1}
                </span>
                <p className="pt-2 text-base font-semibold text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-display text-4xl text-foreground">Questions fréquentes</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[1.25rem] border border-outline/10 bg-surface"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-base font-black text-foreground">
                  {faq.question}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="border-t border-outline/10 px-6 py-5 text-sm leading-7 text-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary text-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-highlight">
              Catalogue premium
            </p>
            <h2 className="mt-3 font-display text-4xl leading-tight">
              Comparez les modèles avec les bonnes informations.
            </h2>
          </div>
          <Link
            href="/plans"
            className="inline-flex rounded-full border border-surface/20 px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-surface transition-colors hover:bg-surface hover:text-secondary"
          >
            Voir le catalogue
          </Link>
        </div>
      </section>
    </>
  );
}
