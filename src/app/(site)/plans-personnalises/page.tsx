import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { formatFcfa } from "@/lib/plans";
import { getCustomPlanPricing } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plans de maison complets et personnalisés",
  description:
    "Faites adapter un modèle WOOPLANS à votre terrain : plans architecturaux complets, façades, coupes et fondations. Honoraires dès 150 000 FCFA, prix du catalogue déduit.",
  alternates: { canonical: "/plans-personnalises" },
};

export default async function CustomPlansPage({ searchParams }: { searchParams: Promise<{ modele?: string }> }) {
  const pricing = await getCustomPlanPricing();
  const { modele } = await searchParams;
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Plans complets</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Votre maison, adaptée à votre terrain</h1>
      <p className="mt-4 max-w-2xl text-foreground/75">
        Une fois votre modèle choisi, nos architectes l&apos;adaptent à votre terrain et à vos souhaits, puis réalisent le dossier complet pour construire.
      </p>

      <div className="mt-8 grid gap-4 rounded-2xl bg-primary/5 p-6 md:grid-cols-2">
        <div>
          <p className="font-semibold">Budget de construction</p>
          <p className="mt-1 text-sm text-foreground/70">
            Le coût des travaux de la maison (matériaux, main-d&apos;œuvre). Il est estimé dans le Catalogue Premium pour chaque modèle.
          </p>
        </div>
        <div>
          <p className="font-semibold">Honoraires des plans personnalisés</p>
          <p className="mt-1 text-sm text-foreground/70">
            Le prix de notre travail d&apos;architecte pour adapter le modèle et produire les plans. C&apos;est ce que présente cette page.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {pricing.offers.map((offer) => (
          <div key={offer.title} className="card p-6">
            <h2 className="text-lg font-semibold">{offer.title}</h2>
            <p className="mt-2 text-sm text-muted">{offer.priceLabel}</p>
            <p className="text-3xl font-bold text-primary">{formatFcfa(offer.priceFrom)}</p>
            <p className="mt-3 text-sm text-foreground/75">{offer.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {offer.deliverables.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-primary" aria-hidden>✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul className="mt-6 space-y-1 text-sm text-foreground/70">
        {pricing.notes.map((n) => (
          <li key={n}>• {n}</li>
        ))}
      </ul>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vous n&apos;avez pas encore choisi votre modèle ?</h2>
          <p className="mt-3 text-foreground/75">
            Commencez par le Catalogue Premium : comparez plus de 50 villas et duplex avec leurs distributions et leurs devis, puis revenez vers nous avec vos favoris.
          </p>
          <Link href={SITE.catalogueUrl} data-cta="custom_plans" className="btn-cta mt-6">
            {SITE.catalogueCta}
          </Link>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Demander un devis</h2>
          <LeadForm defaultPlan={modele} />
        </div>
      </div>
    </div>
  );
}
