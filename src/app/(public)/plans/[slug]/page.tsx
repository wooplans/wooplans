import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlanBySlug, getSimilarPlans } from "@/lib/db";
import { PlanGallery } from "@/components/PlanGallery";
import { RoomTable } from "@/components/RoomTable";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { PremiumTestToggle } from "@/components/PremiumTestToggle";
import { ConversionAnchor } from "@/components/ConversionAnchor";
import { SimilarPlans } from "@/components/SimilarPlans";
import { ZoomablePremiumImage } from "@/components/ZoomablePremiumImage";
import { CostEstimateTable } from "@/components/CostEstimateTable";
import { PlanPersonalizationCTA } from "@/components/PlanPersonalizationCTA";
import { getDefaultCostRate } from "@/lib/cost-rates";
import { getCurrentSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type Props = {
  params: { slug: string };
};

function formatPrice(value: number) {
  return value.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

function getModelCode(name: string, slug: string) {
  const source = `${name} ${slug}`.toUpperCase();
  const explicitCode = source.match(/\b[VD]X?[-\s]?\d{2,4}\b/)?.[0];

  if (explicitCode) {
    const letter = explicitCode.startsWith("D") ? "D" : "V";
    const digits = explicitCode.match(/\d{2,4}/)?.[0] ?? "";
    return digits ? `${letter}X-${digits}` : explicitCode;
  }

  const slugSuffix = slug.toUpperCase().match(/(?:^|[-_\s])([VD])(\d{2,4})(?:$|[-_\s])?/);

  if (slugSuffix) {
    return `${slugSuffix[1]}X-${slugSuffix[2]}`;
  }

  return name;
}

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
  const session = await getCurrentSession();

  const plan = await getPlanBySlug(params.slug);

  if (!plan || !plan.published) {
    notFound();
  }

  const similar = await getSimilarPlans(plan.category, plan.slug);
  const costRate = await getDefaultCostRate(plan.category);
  const modelCode = getModelCode(plan.name, plan.slug);

  const isPremium = session?.user?.role === "subscriber" && session?.user?.isActive === true;

  const premiumContent = (
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

      <section className="max-w-4xl mx-auto px-4 pt-4 pb-8 md:pt-6 md:pb-16">
        <span className="text-[11px] font-semibold px-2.5 py-1 border border-primary/30 text-primary uppercase tracking-[0.2em]">
          {plan.category}
        </span>

        <h1 className="hidden">
          {plan.name}
        </h1>

        <div className="hidden">
          <span>{plan.surface} m²</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bedrooms} chambres</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bathrooms} salles de bain</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.floors} niveau{plan.floors > 1 ? "x" : ""}</span>
        </div>

        <div className="aspect-[16/9] md:aspect-[16/10] overflow-hidden bg-surface mt-6 mb-6 md:mb-8 border border-outline/10 rounded-2xl">
          <Image
            src={plan.thumbnail}
            alt={plan.name}
            width={1600}
            height={1000}
            sizes="(min-width: 768px) 896px, 100vw"
            quality={60}
            priority
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight mb-5 max-w-2xl tracking-tight">
          {plan.name}
        </h1>

        {plan.estimatedTotalPrice > 0 && (
          <p className="text-lg md:text-xl text-foreground/80 font-medium mb-6">
            Budget estimé :{" "}
            <span className="text-accent font-semibold">
              {formatPrice(plan.estimatedTotalPrice)} FCFA
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/50 font-medium mb-8">
          <span>{plan.surface} m²</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bedrooms} chambres</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.bathrooms} salles de bain</span>
          <span className="w-1.5 h-1.5 bg-foreground/30" />
          <span>{plan.floors} niveau{plan.floors > 1 ? "x" : ""}</span>
        </div>

        <a
          href="#plan-et-devis"
          className="inline-flex w-full sm:w-auto items-center justify-center px-7 py-3 bg-accent text-white text-sm font-bold rounded-full hover:bg-accent/90 transition-colors"
        >
          Voir le plan et devis
        </a>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-surface border border-outline/10 rounded-2xl p-6">
          <h2 className="text-lg font-black text-foreground tracking-tight mb-3">
            Description du modele
          </h2>
          <p className="text-foreground/60 leading-relaxed max-w-2xl">
            {plan.description}
          </p>
        </div>
      </section>

      <PlanGallery images={plan.images} name={plan.name} modelCode={modelCode} />

      <section className="max-w-4xl mx-auto px-4 pb-12">
        <RoomTable rooms={plan.rooms} />
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="h-px bg-outline/10" />
      </div>

      <section id="plan-et-devis" className="max-w-4xl mx-auto px-4 pb-8 scroll-mt-24">
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
          Contenu Premium
            </h2>
            <p className="text-xs text-foreground/50 uppercase tracking-[0.2em] font-semibold">
          Débloquez l&apos;accès complet pour voir les détails
            </p>
          </div>
          <PremiumTestToggle initialUnlocked={isPremium} />
        </div>
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
              backgroundImage={plan.distributionPlans[0] || undefined}
              initialUnlocked={isPremium}
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
              Devis estimatif de la fondation aux finitions.
            </p>
          </div>
          <div className="px-6 pb-6">
            <PremiumTeaser
              type="cost"
              title="Devis estimatif"
              subtitle="Devis estimatif de la fondation aux finitions."
              realContent={costContent}
              previewContent={costContent}
              initialUnlocked={isPremium}
            />
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-8">
        <ConversionAnchor
          category={plan.category}
          name={plan.name}
          slug={plan.slug}
          thumbnail={plan.thumbnail}
          initialPremium={isPremium}
        />
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-12">
        <PlanPersonalizationCTA
          isPremium={isPremium}
          category={plan.category}
          name={plan.name}
          surface={plan.surface}
          slug={plan.slug}
        />
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
