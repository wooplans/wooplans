import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlanBySlug, getSimilarPlans } from "@/lib/db";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanStats } from "@/components/PlanStats";
import { RoomTable } from "@/components/RoomTable";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { ConversionAnchor } from "@/components/ConversionAnchor";
import { SimilarPlans } from "@/components/SimilarPlans";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const revalidate = 60;

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPlanBySlug(params.slug);

  if (!plan || !plan.published) {
    return { title: "Plan introuvable — WooPlans" };
  }

  return {
    title: `${plan.name} — WooPlans`,
    description: plan.description,
    openGraph: {
      title: `${plan.name} — WooPlans`,
      description: plan.description,
      images: plan.thumbnail ? [{ url: plan.thumbnail }] : undefined,
    },
  };
}

export default async function PlanDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  const plan = await getPlanBySlug(params.slug);

  if (!plan || !plan.published) {
    notFound();
  }

  const similar = await getSimilarPlans(plan.category, plan.slug);

  const isPremium = session?.user?.role === "subscriber" && session?.user?.isActive;

  const premiumContent = isPremium ? (
    <>
      <h3 className="text-xl font-black text-foreground mb-4 tracking-tight">Plan de distribution complet</h3>
      {plan.distributionPlanUrl && (
        <div className="aspect-[16/9] overflow-hidden bg-surface mb-6 border-2 border-outline">
          <iframe
            src={plan.distributionPlanUrl}
            className="w-full h-full border-0"
            title={`Plan de distribution - ${plan.name}`}
          />
        </div>
      )}
        <div className="bg-surface border-2 border-outline p-6">
          <h4 className="font-bold text-foreground mb-4">Détails des pièces</h4>
          <div className="grid grid-cols-2 gap-0 border-2 border-outline">
            {plan.rooms.map((room: {name: string, area: number}, index: number) => (
              <div key={index} className={`bg-white p-4 ${index % 2 !== 0 ? 'border-l-2 border-outline' : ''} ${index >= 2 ? 'border-t-2 border-outline' : ''}`}>
                <p className="font-bold text-foreground">{room.name}</p>
                <p className="text-sm text-foreground/60">{room.area} m²</p>
              </div>
            ))}
          </div>
        </div>
    </>
  ) : null;

  const costContent = isPremium ? (
    <>
      <h3 className="text-xl font-black text-foreground mb-4 tracking-tight">Devis estimatif détaillé</h3>
      {plan.estimatedCostImage ? (
        <div className="aspect-[16/9] overflow-hidden bg-surface mb-6 border-2 border-outline">
          <img
            src={plan.estimatedCostImage}
            alt="Devis estimatif"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="bg-surface border-2 border-outline p-6">
          <p className="text-foreground/60">Aucun devis disponible pour ce plan.</p>
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      <nav className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 text-xs text-foreground/40 font-medium">
          <Link href="/" className="hover:text-primary transition-colors">
            Accueil
          </Link>
          <span>/</span>
          <Link href="/plans" className="hover:text-primary transition-colors">
            Catalogue
          </Link>
          <span>/</span>
          <span className="text-foreground/70">{plan.name}</span>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        <span className="text-[11px] font-semibold px-2.5 py-1 border border-primary/30 text-primary uppercase tracking-[0.2em]">
          {plan.category}
        </span>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight mt-4 mb-6 max-w-2xl tracking-tight">
          {plan.name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/50 font-medium mb-8">
          <span>{plan.surface} m²</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bedrooms} chambres</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bathrooms} salles de bain</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.floors} niveau{plan.floors > 1 ? "x" : ""}</span>
        </div>

        <div className="aspect-[16/10] overflow-hidden bg-surface mb-10 border border-outline/10 rounded-2xl">
          <img
            src={plan.thumbnail}
            alt={plan.name}
            className="w-full h-full object-cover"
          />
        </div>

        <p className="text-foreground/60 leading-relaxed max-w-2xl mb-12">
          {plan.description}
        </p>
      </section>

      <PlanGallery images={plan.images} name={plan.name} />

      <section className="max-w-4xl mx-auto px-4 py-12">
        <PlanStats
          surface={plan.surface}
          bedrooms={plan.bedrooms}
          bathrooms={plan.bathrooms}
          floors={plan.floors}
        />
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-12">
        <RoomTable rooms={plan.rooms} />
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="h-px bg-outline/10" />
      </div>

      <section className="max-w-4xl mx-auto px-4 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
          Contenu Premium
        </h2>
        <p className="text-xs text-foreground/50 uppercase tracking-[0.2em] font-semibold">
          Débloquez l&apos;accès complet pour voir les détails
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-surface border border-outline/10 rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Plans de distribution
            </h2>
            <p className="text-sm text-foreground/50 mt-1">
              Agencement complet avec cotations et dimensions de chaque pièce.
            </p>
          </div>
          <div className="px-6 pb-6">
            <PremiumTeaser
              type="floorplan"
              title="Plan de distribution"
              subtitle="Agencement complet avec cotations et dimensions de chaque pièce."
              realContent={premiumContent}
              backgroundImage={plan.distributionPlans?.[0] || plan.distributionPlanUrl || undefined}
            />
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="h-px bg-outline/10" />
      </div>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-surface border border-outline/10 rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Devis estimatif
            </h2>
            <p className="text-sm text-foreground/50 mt-1">
              Budget prévisionnel détaillé par poste de construction.
            </p>
          </div>
          <div className="px-6 pb-6">
            <PremiumTeaser
              type="cost"
              title="Devis estimatif"
              subtitle="Budget prévisionnel détaillé par poste de construction."
              realContent={costContent}
              backgroundImage={plan.estimatedCostImage || undefined}
            />
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <ConversionAnchor />
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="h-px bg-outline/10" />
      </div>

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <SimilarPlans plans={similar} currentSlug={plan.slug} />
      </section>
    </>
  );
}
