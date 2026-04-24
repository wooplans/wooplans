import Image from "next/image";
import Link from "next/link";
import { listPlans } from "@/lib/db";
import { PlanGrid } from "@/components/PlanGrid";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function HomePage() {
  const featuredPlans = await listPlans({ featured: true, published: true });

  return (
    <>
      <section className="relative overflow-hidden bg-secondary text-surface">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(184,106,60,0.35),transparent_32%),linear-gradient(135deg,rgba(255,253,248,0.08),transparent_45%)]" />
        <div className="relative max-w-7xl mx-auto grid gap-12 px-4 sm:px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-28">
          <div>
            <span className="inline-flex items-center rounded-full border border-primary/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Catalogue architectural premium
            </span>
            <h1 className="mt-7 max-w-3xl font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Choisissez un modèle. Étudiez le plan. Construisez avec méthode.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-surface/68 md:text-lg">
              Villas et duplex prêts à explorer, avec vues 3D, plans de distribution et devis estimatifs pour avancer avec une vision claire.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/plans"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(184,106,60,0.35)] transition-colors hover:bg-primary-dark"
              >
                Explorer le catalogue
              </Link>
              <Link
                href="/abonnement"
                className="inline-flex items-center justify-center rounded-full border border-surface/25 px-8 py-3 text-sm font-black text-surface transition-colors hover:border-primary hover:text-primary"
              >
                Voir Premium
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {featuredPlans.slice(0, 4).map((plan, index) => (
              <Link
                key={plan.slug}
                href={`/plans/${plan.slug}`}
                className={`group relative overflow-hidden rounded-[2rem] bg-surface/10 ${index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/5]"}`}
              >
                <Image
                  src={plan.thumbnail}
                  alt={plan.name}
                  width={900}
                  height={650}
                  sizes="(min-width: 768px) 38vw, 92vw"
                  quality={58}
                  className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{plan.category}</p>
                  <p className="mt-1 font-semibold text-surface">{plan.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featuredPlans.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Sélection</p>
              <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
                Modèles les plus consultés
              </h2>
            </div>
            <Link href="/plans" className="text-sm font-black text-primary hover:text-primary-dark">
              Voir tous les plans
            </Link>
          </div>
          <PlanGrid plans={featuredPlans} />
        </section>
      )}

      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Méthode</p>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
              Du coup d’œil au dossier complet
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["01", "Explorez", "Comparez les modèles avec vues 3D, surfaces, pièces et ambiance générale."],
              ["02", "Débloquez", "Consultez les plans de distribution et le devis estimatif pour cadrer le budget."],
              ["03", "Commandez", "Demandez le dossier complet du modèle choisi et avancez vers la construction."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-[2rem] border border-outline/10 bg-background p-8">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-primary">{step}</div>
                <h3 className="mt-6 font-display text-3xl text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
