import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { CUSTOM_PLAN_OFFERS, memberBalance } from "@/lib/custom-plans";
import { formatFcfa } from "@/lib/plans";
import { cataloguePrice, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plans de maison complets et personnalisés",
  description:
    "Faites adapter un modèle WOOPLANS à votre terrain : plans architecturaux complets, façades, coupes et fondations. Prix fixe : 149 000 FCFA pour une villa, 249 000 FCFA pour un duplex, prix du catalogue déduit.",
  alternates: { canonical: "/plans-personnalises" },
};

export default async function CustomPlansPage({ searchParams }: { searchParams: Promise<{ modele?: string }> }) {
  const { modele } = await searchParams;
  const catalogue = formatFcfa(cataloguePrice());
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Plans complets</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Vos plans complets personnalisés, à prix fixe</h1>
      <p className="mt-4 max-w-2xl text-foreground/75">
        Une fois votre modèle choisi, nos architectes l&apos;adaptent à votre terrain et à vos souhaits, puis réalisent le dossier complet pour
        construire. Un prix unique, annoncé dès le départ.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {CUSTOM_PLAN_OFFERS.map((offer) => (
          <div key={offer.category} className="card flex flex-col p-6">
            <h2 className="text-lg font-semibold">{offer.title}</h2>
            <p className="mt-2 text-3xl font-bold text-primary">{formatFcfa(offer.price)}</p>
            <p className="text-sm text-muted">prix fixe</p>
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
                Membre Premium : vous payez seulement <strong className="text-primary">{formatFcfa(memberBalance(offer))}</strong>
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-2xl bg-primary/5 p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Le Catalogue Premium vous revient à 0 FCFA</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">Étape 1</p>
            <p className="mt-1 font-semibold">Vous choisissez votre modèle avec le Catalogue Premium : {catalogue}</p>
            <p className="mt-1 text-sm text-foreground/70">
              Distributions cotées, surfaces des pièces et devis détaillé de chaque modèle, pour comparer et choisir sereinement.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Étape 2</p>
            <p className="mt-1 font-semibold">Vous commandez vos plans complets : vous payez juste la différence</p>
            <ul className="mt-1 space-y-0.5 text-sm text-foreground/70">
              {CUSTOM_PLAN_OFFERS.map((offer) => (
                <li key={offer.category}>
                  {offer.title} : {formatFcfa(offer.price)} − {catalogue} = <strong className="text-foreground">{formatFcfa(memberBalance(offer))}</strong>
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
          <h2 className="text-2xl font-semibold tracking-tight">Vous n&apos;avez pas encore choisi votre modèle ?</h2>
          <p className="mt-3 text-foreground/75">
            Commencez par le Catalogue Premium : comparez plus de 50 villas et duplex avec leurs distributions et leurs devis. Son prix est
            entièrement déduit de vos plans complets.
          </p>
          <Link href={SITE.catalogueUrl} data-cta="custom_plans" className="btn-cta mt-6">
            {SITE.catalogueCta}
          </Link>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Commander vos plans complets</h2>
          <LeadForm defaultPlan={modele} />
        </div>
      </div>
    </div>
  );
}
