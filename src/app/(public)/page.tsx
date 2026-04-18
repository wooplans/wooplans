import Link from "next/link";
import { listPlans } from "@/lib/db";
import { PlanGrid } from "@/components/PlanGrid";

export const revalidate = 60;

export default async function HomePage() {
  const featuredPlans = await listPlans({ featured: true, published: true });

  return (
    <>
      <section className="bg-background border-b border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center text-xs font-semibold px-3 py-1 border border-primary/30 text-primary uppercase tracking-[0.2em] mb-6">
            Architecture &amp; Construction
          </span>
          <h1 className="text-3xl md:text-5xl font-semibold mb-4 leading-tight tracking-tight text-foreground">
            Trouvez le plan idéal
            <br />
            pour votre projet de construction
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            Catalogue de villas et duplex conçus pour l&apos;Afrique
          </p>
          <Link
            href="/plans"
            className="inline-flex items-center justify-center bg-primary text-white font-semibold px-8 py-3 rounded-full border border-primary hover:bg-primary-dark transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>
      </section>

      {featuredPlans.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 tracking-tight">
            Plans populaires
          </h2>
          <PlanGrid plans={featuredPlans} />
        </section>
      )}

      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-12 text-center tracking-tight">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="text-3xl font-semibold text-primary mb-3">01</div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                Consultez les plans et devis
              </h3>
              <p className="text-foreground/60 text-sm">
                Abonnez-vous pour visualiser les plans de distribution et
                accéder aux devis estimatifs de tous nos modèles.
              </p>
            </div>
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="text-3xl font-semibold text-primary mb-3">02</div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                Échangez avec nos architectes
              </h3>
              <p className="text-foreground/60 text-sm">
                Choisissez un modèle de référence et donnez-nous les
                modifications que vous souhaitez sur WhatsApp.
              </p>
            </div>
            <div className="text-center p-8 border border-outline/10 bg-background rounded-2xl">
              <div className="text-3xl font-semibold text-primary mb-3">03</div>
              <h3 className="font-semibold text-base mb-2 tracking-tight">
                Commandez les plans complets
              </h3>
              <p className="text-foreground/60 text-sm">
                Commandez et obtenez les plans architecturaux complets
                personnalisés et lancez votre projet de construction.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
