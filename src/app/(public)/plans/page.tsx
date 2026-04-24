import { listPlans } from "@/lib/db";
import { CatalogueClient } from "@/components/CatalogueClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PlansPage() {
  const plans = await listPlans({ published: true });

  return (
    <>
      <section className="border-b border-outline/10 bg-secondary text-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Catalogue</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight tracking-tight md:text-6xl">
            Trouvez le modèle qui cadre votre futur chantier.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface/65">
            Filtrez les villas et duplex, comparez les surfaces, puis ouvrez chaque fiche pour explorer les vues 3D, plans et devis.
          </p>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <CatalogueClient plans={plans} />
      </div>
    </>
  );
}
