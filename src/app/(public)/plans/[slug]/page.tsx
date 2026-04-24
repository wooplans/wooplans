import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlanBySlug, getSimilarPlans } from "@/lib/db";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanStats } from "@/components/PlanStats";
import { RoomTable } from "@/components/RoomTable";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { PremiumTestToggle } from "@/components/PremiumTestToggle";
import { ConversionAnchor } from "@/components/ConversionAnchor";
import { SimilarPlans } from "@/components/SimilarPlans";
import { ZoomablePremiumImage } from "@/components/ZoomablePremiumImage";
import { CostEstimateTable } from "@/components/CostEstimateTable";
import { getDefaultCostRate } from "@/lib/cost-rates";
import { getCurrentSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPlanBySlug(params.slug);

  if (!plan || !plan.published) {
    return { title: "Plan introuvable - WooPlans" };
  }

  return {
    title: `${plan.name} - WooPlans`,
    description: plan.description,
    openGraph: {
      title: `${plan.name} - WooPlans`,
      description: plan.description,
      images: plan.thumbnail ? [{ url: plan.thumbnail }] : undefined,
    },
  };
}

export default async function PlanDetailPage({ params }: Props) {
  const session = await getCurrentSession();
  const plan = await getPlanBySlug(params.slug);

  if (!plan || !plan.published) {
    notFound();
  }

  const similar = await getSimilarPlans(plan.category, plan.slug);
  const costRate = await getDefaultCostRate(plan.category);
  const isPremium = session?.user?.role === "subscriber" && session?.user?.isActive;

  const distributionContent = (
    <>
      {plan.distributionPlans.length > 0 ? (
        <div className="space-y-6">
          {plan.distributionPlans.map((imageUrl, index) => (
            <ZoomablePremiumImage
              key={imageUrl}
              src={imageUrl}
              alt={`${plan.name} - plan de distribution ${index + 1}`}
            />
          ))}
        </div>
      ) : plan.distributionPlanUrl ? (
        <div className="aspect-[16/9] overflow-hidden bg-surface">
          <iframe
            src={plan.distributionPlanUrl}
            className="w-full h-full border-0"
            title={`Plan de distribution - ${plan.name}`}
          />
        </div>
      ) : (
        <div className="bg-surface p-6">
          <p className="text-foreground/60">Aucun plan de distribution disponible pour ce plan.</p>
        </div>
      )}
    </>
  );

  const costContent = (
    <CostEstimateTable
      planName={plan.name}
      category={plan.category}
      surface={plan.surface}
      amountPerSquareMeter={costRate?.amountPerSquareMeter ?? null}
    />
  );

  return (
    <>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 text-xs text-foreground/45 font-bold">
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

      <section className="relative overflow-hidden bg-secondary text-surface">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(184,106,60,0.3),transparent_35%)]" />
        <div className="relative max-w-7xl mx-auto grid gap-10 px-4 sm:px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-16">
          <div className="order-2 md:order-1">
            <span className="inline-flex rounded-full border border-primary/45 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              {plan.category}
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Découvrez {plan.name}, du rendu 3D au budget estimatif.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-surface/68 md:text-lg">
              Parcourez les vues, les pièces, le plan de distribution et le devis pour décider si ce modèle correspond à votre projet de construction.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [`${plan.surface} m²`, "Surface"],
                [`${plan.bedrooms}`, "Chambres"],
                [`${plan.bathrooms}`, "Salles d'eau"],
                [`${plan.floors}`, "Niveaux"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.25rem] border border-surface/10 bg-surface/8 p-4 backdrop-blur">
                  <p className="font-display text-3xl">{value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-surface/45">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#devis" className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-black text-white hover:bg-primary-dark">
                Voir le devis
              </a>
              <a href="#distribution" className="inline-flex items-center justify-center rounded-full border border-surface/25 px-7 py-3 text-sm font-black text-surface hover:border-primary hover:text-primary">
                Explorer le plan
              </a>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-surface/10 md:aspect-[5/6]">
              <Image
                src={plan.thumbnail}
                alt={plan.name}
                width={1600}
                height={1000}
                sizes="(min-width: 768px) 50vw, 100vw"
                quality={64}
                priority
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-surface/10" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">
          {plan.description}
        </p>
      </section>

      <PlanGallery images={plan.images} name={plan.name} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Fiche modèle</p>
          <h2 className="mt-3 font-display text-4xl text-foreground">Les repères essentiels</h2>
        </div>
        <PlanStats
          surface={plan.surface}
          bedrooms={plan.bedrooms}
          bathrooms={plan.bathrooms}
          floors={plan.floors}
        />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <RoomTable rooms={plan.rooms} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-primary/20 bg-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-foreground">
              Contenu Premium
            </h2>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-muted">
              Débloquez les détails techniques et le budget
            </p>
          </div>
          <PremiumTestToggle initialUnlocked={isPremium} />
        </div>
      </section>

      <section id="distribution" className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 scroll-mt-24">
        <div className="rounded-[2rem] border border-outline/10 bg-surface shadow-[0_20px_70px_rgba(38,33,29,0.06)]">
          <div className="px-6 pt-6 pb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Distribution</p>
            <h2 className="mt-2 font-display text-4xl text-foreground">
              Plan complet et cotations
            </h2>
            <p className="text-sm text-muted mt-2">
              Agencement complet avec cotations et dimensions de chaque pièce.
            </p>
          </div>
          <div className="px-6 pb-6">
            <PremiumTeaser
              type="floorplan"
              title="Plan de distribution"
              subtitle="Agencement complet avec cotations et dimensions de chaque pièce."
              realContent={distributionContent}
              backgroundImage={plan.distributionPlans[0] || undefined}
              initialUnlocked={isPremium}
            />
          </div>
        </div>
      </section>

      <section id="devis" className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 scroll-mt-24">
        <div className="rounded-[2rem] border border-outline/10 bg-surface shadow-[0_20px_70px_rgba(38,33,29,0.06)]">
          <div className="px-6 pt-6 pb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Budget</p>
            <h2 className="mt-2 font-display text-4xl text-foreground">
              Devis estimatif
            </h2>
            <p className="text-sm text-muted mt-2">
              Budget prévisionnel détaillé par poste de construction.
            </p>
          </div>
          <div className="px-6 pb-6">
            <PremiumTeaser
              type="cost"
              title="Devis estimatif"
              subtitle="Budget prévisionnel détaillé par poste de construction."
              realContent={costContent}
              previewContent={costContent}
              initialUnlocked={isPremium}
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <ConversionAnchor
          category={plan.category}
          name={plan.name}
          slug={plan.slug}
          initialPremium={isPremium}
        />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <SimilarPlans plans={similar} currentSlug={plan.slug} />
      </section>
    </>
  );
}
