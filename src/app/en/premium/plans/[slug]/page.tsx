import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanGallery } from "@/components/PlanGallery";
import { FloorPlanViewer } from "@/components/premium/FloorPlanViewer";
import { CostCalculator } from "@/components/premium-en/CostCalculator";
import { requireMemberEn } from "@/lib/auth";
import { CUSTOM_PLAN_OFFERS } from "@/lib/custom-plans";
import { getPremiumPlan } from "@/lib/plans";
import { privateFileUrl } from "@/lib/premium";
import { defaultRate, planTextEn, publishedRates } from "@/lib/premium-en";
import { enPricing, factsEn, lotShares, modelNameEn, type EnConfig } from "@/lib/sales-page-en";
import { whatsappLink } from "@/lib/site";
import catalogueEn from "@/config/catalogue-en.json";
import costRates from "@/config/cost-rates-en.json";
import plansEn from "@/config/plans-en.json";

const FULL_PLANS = {
  villa: CUSTOM_PLAN_OFFERS.find((o) => o.category === "villa")!.price,
  duplex: CUSTOM_PLAN_OFFERS.find((o) => o.category === "duplex")!.price,
};

export default async function PremiumEnPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const member = await requireMemberEn();
  const plan = await getPremiumPlan((await params).slug);
  if (!plan || (plan.category !== "villa" && plan.category !== "duplex")) notFound();
  const name = modelNameEn(plan);
  const text = planTextEn(plansEn, plan.code);
  const pricing = enPricing(catalogueEn as EnConfig, member.country, FULL_PLANS);
  const rates = publishedRates(costRates, pricing.country, plan.levels);
  const defaults = {
    basic: defaultRate(rates?.ranges.basic) ?? undefined,
    standard: defaultRate(rates?.ranges.standard) ?? undefined,
    luxury: defaultRate(rates?.ranges.luxury) ?? undefined,
  };
  const images = [plan.coverImage, ...plan.renders.filter((r) => r !== plan.coverImage)].filter(Boolean);
  const fullPrice = plan.levels >= 2 ? pricing.duplex : pricing.villa;
  const orderMessage = `Hello WOOPLANS, I am a Premium member (${member.email}) and I would like to order the full construction drawings of house plan ${plan.code}.`;

  return (
    <div className="container-page py-8">
      <Link href="/en/premium" className="text-sm text-muted hover:text-primary">← All house plans</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <PlanGallery images={images} alt={name} lang="en" />
        <div>
          <p className="eyebrow">{plan.levels >= 2 ? "Two-story house" : "Bungalow"} · ID {plan.code}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {factsEn(plan).map((f) => <span key={f} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{f}</span>)}
          </div>
          {text ? <p className="mt-4 text-foreground/80">{text.description}</p> : null}
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {plan.buildingWidth && plan.buildingDepth ? (
              <div className="card p-3"><dt className="text-muted">Building size</dt><dd className="font-semibold">{plan.buildingWidth} m × {plan.buildingDepth} m</dd></div>
            ) : null}
            {plan.landArea ? (
              <div className="card p-3"><dt className="text-muted">Minimum plot size</dt><dd className="font-semibold">{plan.landArea} m²{plan.landWidth && plan.landDepth ? ` (${plan.landWidth} × ${plan.landDepth} m)` : ""}</dd></div>
            ) : null}
          </dl>
        </div>
      </div>

      {plan.floorPlans.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Floor plans with dimensions</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {plan.floorPlans.map((key, i) =>
              key.toLowerCase().endsWith(".pdf") ? (
                <a key={key} href={privateFileUrl(key)} target="_blank" rel="noopener noreferrer" className="card flex items-center justify-between gap-4 p-5">
                  <span className="font-semibold">{`${name} — floor plan ${i + 1} (PDF)`}</span>
                  <span className="text-sm text-muted">Open</span>
                </a>
              ) : (
                <FloorPlanViewer key={key} src={privateFileUrl(key)} alt={`${name} — floor plan ${i + 1}`} lang="en" />
              ),
            )}
          </div>
        </section>
      ) : null}

      {plan.estimateLots.length > 0 && plan.surfaceTotal > 0 ? (
        <section className="mt-12 max-w-2xl">
          <h2 className="text-xl font-semibold">Construction Cost Calculator</h2>
          <p className="mt-1 text-sm text-foreground/70">How the construction budget of this house splits by item. Choose a level or enter your builder&apos;s price per m².</p>
          <div className="mt-4">
            <CostCalculator
              area={plan.surfaceTotal}
              currency={pricing.currency}
              shares={lotShares(plan.estimateLots)}
              ranges={rates?.ranges ?? {}}
              defaults={defaults}
              source={rates ? { name: rates.source, url: rates.url } : null}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl bg-primary-dark p-6 text-white md:p-8">
        <h2 className="text-xl font-semibold">Is this the right house?</h2>
        <p className="mt-2 max-w-2xl text-white/75">
          Our architects adapt it to your plot and draw your full construction drawings (10 drawings: foundation, floor plans, 4 elevations, 2 sections, roof and septic tank).
          Price: <strong className="text-white">{fullPrice}</strong>, delivered in 7 working days. Your local authority may ask for drawings stamped by a locally registered professional.
        </p>
        <a href={whatsappLink(orderMessage)} target="_blank" rel="noopener noreferrer" data-whatsapp={`premium_en_order_${plan.slug}`} className="btn mt-5 bg-[#25D366] text-white hover:bg-[#1eb457]">
          Order on WhatsApp
        </a>
      </section>
    </div>
  );
}
