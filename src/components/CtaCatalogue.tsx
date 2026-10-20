import Link from "next/link";
import { countPublishedPlans, formatFcfa, withPlanCount } from "@/lib/plans";
import { cataloguePrice, SITE } from "@/lib/site";

/** Bandeau d'appel à l'action unique vers la page de vente. */
export async function CtaCatalogue({ ctaId, title, text }: { ctaId: string; title?: string; text?: string }) {
  const plans = text ? null : withPlanCount(await countPublishedPlans(), "villas et duplex", "tous nos modèles de");
  return (
    <section className="bg-primary text-white">
      <div className="container-page flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title ?? "Comparez tous les modèles avec leurs plans et leurs devis"}
          </h2>
          <p className="mt-3 text-white/75">
            {text ??
              `Le Catalogue Premium réunit ${plans} avec distributions cotées et devis estimatifs détaillés. ${formatFcfa(cataloguePrice())}, paiement unique, accès à vie.`}
          </p>
        </div>
        <Link href={SITE.catalogueUrl} data-cta={ctaId} className="btn-cta shrink-0 px-8 py-4 text-base">
          {SITE.catalogueCta}
        </Link>
      </div>
    </section>
  );
}
