import type { Metadata } from "next";
import Link from "next/link";
import { PlanRequestForm } from "@/components/PlanRequestForm";
import { CUSTOM_PLAN_OFFERS } from "@/lib/custom-plans";
import { countPublishedPlans, formatFcfa, withPlanCount } from "@/lib/plans";
import { cataloguePrice, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plans de maison complets et personnalisés",
  description:
    "Faites adapter un modèle WOOPLANS à votre terrain : plans architecturaux complets, façades, coupes et fondations. Prix fixe, Catalogue Premium inclus : 250 000 FCFA pour une villa, 350 000 FCFA pour un duplex.",
  alternates: { canonical: "/plans-personnalises" },
};

export default async function CustomPlansPage({ searchParams }: { searchParams: Promise<{ modele?: string }> }) {
  const { modele } = await searchParams;
  const plans = withPlanCount(await countPublishedPlans(), "villas et duplex", "tous nos modèles de");
  const catalogue = cataloguePrice();
  const priceNote = CUSTOM_PLAN_OFFERS.map((o) => `${o.category} ${formatFcfa(o.price)}`).join(", ") + ", Catalogue Premium inclus";
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Plans complets</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Vos plans complets personnalisés, à prix fixe</h1>
      <p className="mt-4 max-w-2xl text-foreground/75">
        Une fois votre modèle choisi, nos architectes l&apos;adaptent à votre terrain et à vos souhaits, puis réalisent le dossier complet pour
        construire.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {CUSTOM_PLAN_OFFERS.map((offer) => (
          <div key={offer.category} className="card flex flex-col p-6">
            <h2 className="text-lg font-semibold">{offer.title}</h2>
            <p className="mt-2 text-3xl font-bold text-primary">{formatFcfa(offer.price)}</p>
            <p className="text-sm text-muted">prix fixe, Catalogue Premium inclus</p>
            <p className="mt-3 text-sm text-foreground/75">{offer.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {offer.deliverables.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-primary" aria-hidden>✓</span>
                  {d}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <p className="rounded-xl bg-highlight/15 px-4 py-3 text-sm">
                Étape 1 : Catalogue Premium (<strong>{formatFcfa(catalogue)}</strong>). Étape 2 : personnalisation (
                <strong className="text-primary">{formatFcfa(offer.price - catalogue)}</strong>).
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm">
        <Link href="/livrables-plans-complets" data-cta="custom_plans_livrables" className="font-semibold text-primary hover:underline">
          Voir le détail des 10 plans livrés et la personnalisation →
        </Link>
      </p>

      <section className="mt-12 rounded-2xl bg-primary/5 p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Comment ça se passe</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">Étape 1</p>
            <p className="mt-1 font-semibold">Vous recevez le Catalogue Premium et choisissez votre modèle</p>
            <p className="mt-1 text-sm text-foreground/70">
              {formatFcfa(catalogue)}, inclus dans le prix des plans complets : distributions cotées, surfaces des pièces et devis
              détaillés de chaque modèle, pour choisir sereinement. Vous pouvez commencer par cette étape même si vous n&apos;êtes pas
              prêt pour la suite.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Étape 2</p>
            <p className="mt-1 font-semibold">Nos architectes personnalisent votre plan (solde)</p>
            <ul className="mt-1 space-y-0.5 text-sm text-foreground/70">
              {CUSTOM_PLAN_OFFERS.map((offer) => (
                <li key={offer.category}>
                  {offer.title} : <strong className="text-foreground">{formatFcfa(offer.price - catalogue)}</strong> (total{" "}
                  {formatFcfa(offer.price)})
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-foreground/70">
          Ce prix couvre notre travail d&apos;architecte (les plans). Il est distinct du budget de construction de la maison, estimé pour chaque
          modèle dans le Catalogue Premium.
        </p>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pas encore prêt pour les plans complets ?</h2>
          <p className="mt-3 text-foreground/75">
            Commencez par l&apos;étape 1, le Catalogue Premium : comparez {plans} avec leurs distributions et leurs devis. Son prix est
            déduit de vos plans complets.
          </p>
          <Link href={SITE.catalogueUrl} data-cta="custom_plans" className="btn-cta mt-6">
            {SITE.catalogueCta}
          </Link>
        </div>
        <div>
          <h2 id="demande" className="mb-2 scroll-mt-24 text-2xl font-semibold tracking-tight">Parler à un architecte</h2>
          <p className="mb-4 text-sm text-foreground/70">Quelques questions sur votre projet, puis vous échangez avec nous sur WhatsApp.</p>
          <PlanRequestForm defaultPlan={modele} priceNote={priceNote} />
        </div>
      </div>
    </div>
  );
}
