import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExtraitOffer } from "@/components/extrait/ExtraitOffer";
import { ExtraitTracker } from "@/components/extrait/ExtraitTracker";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { offerFor, publicOffer } from "@/lib/catalogue-offer";
import { extraitBuyer, isUnlocked } from "@/lib/extrait-web";
import { EXTRAIT_SLUGS, EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { countPublishedPlans, listPublicPlans, type PublicPlan } from "@/lib/plans";
import { salutation } from "@/lib/civilite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre Extrait du Catalogue Premium",
  description: "Vos 5 maisons avec leur plan coté et leur devis poste par poste, et toutes les autres maisons du catalogue.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Votre Extrait du Catalogue Premium WooPlans",
    description: "5 maisons avec plan coté et devis poste par poste, à voir sur votre téléphone.",
    images: [{ url: "/assets/extrait/apercu-mon-extrait.jpg", width: 1200, height: 630 }],
  },
};

const millions = (v: number | null) => (v === null ? "" : (v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

function Card({ id, plan, locked }: { id: string; plan: PublicPlan; locked: boolean }) {
  return (
    <Link href={`/mon-extrait/${id}/${plan.slug}`} className="overflow-hidden rounded-xl border border-outline bg-white transition hover:shadow-md">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${plan.coverImage}?w=480`} alt={`Rendu 3D ${plan.code}`} width={480} height={300} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" />
        <span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${locked ? "bg-white/90" : "bg-emerald-600 text-white"}`}>
          {locked ? "🔒 Plan + devis" : "✓ Plan + devis"}
        </span>
      </div>
      <div className="px-2.5 py-2 text-xs">
        <p className="font-semibold">
          {plan.category === "duplex" ? "Duplex" : "Villa"} {plan.code}
        </p>
        <p className="text-muted">
          {plan.bedrooms} ch. · {plan.surfaceTotal} m²
          {plan.budgetMin && plan.budgetMax ? ` · ${millions(plan.budgetMin)} à ${millions(plan.budgetMax)} M` : ""}
        </p>
      </div>
    </Link>
  );
}

/**
 * Extrait du Catalogue Premium en page web (lien personnel, non indexé) : les 5 maisons débloquées en tête,
 * puis toutes les autres (rendus visibles, plan et devis verrouillés), avec le prix du catalogue de l'acheteur.
 * Le PDF de l'extrait reste téléchargeable.
 */
export default async function MonExtraitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buyer = await extraitBuyer(id);
  if (!buyer) notFound();
  const [all, count, { offer }] = await Promise.all([
    listPublicPlans({ limit: 200 }).catch(() => [] as PublicPlan[]),
    countPublishedPlans(),
    offerFor({ email: buyer.email }).catch(() => ({ offer: publicOffer() })),
  ]);
  const withCover = all.filter((p) => p.coverImage);
  const mine = EXTRAIT_SLUGS.map((s) => withCover.find((p) => p.slug === s)).filter((p): p is PublicPlan => Boolean(p));
  const others = withCover.filter((p) => !isUnlocked(p.slug));
  const total = count ?? withCover.length;
  const who = salutation(buyer.name);

  return (
    <>
      <ExtraitTracker id={buyer.intentId} />
      <section className="bg-primary text-white">
        <div className="container-page max-w-5xl pb-8 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
          <p className="mt-6 text-sm text-white/75">{who ? `Bonjour ${who} 👋` : "Bonjour 👋"}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight md:text-4xl">Votre Extrait du Catalogue Premium</h1>
          <p className="mt-2 max-w-2xl text-white/85">
            Vos {mine.length} maisons avec leur plan coté et leur devis poste par poste. Touchez une maison pour l&apos;ouvrir.
          </p>
          <a href={`/api/guide/${buyer.intentId}`} className="mt-4 inline-flex rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            Télécharger aussi le PDF
          </a>
        </div>
      </section>

      <section className="container-page max-w-5xl py-8">
        <h2 className="text-xl font-semibold">Vos {mine.length} maisons débloquées</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {mine.map((p) => (
            <Card key={p.slug} id={buyer.intentId} plan={p} locked={false} />
          ))}
        </div>
      </section>

      <section className="container-page max-w-5xl pb-6">
        <ExtraitOffer id={buyer.intentId} offer={offer} publicPrice={publicOffer().price} total={total} />
      </section>

      <section className="bg-surface py-8">
        <div className="container-page max-w-5xl pb-24 sm:pb-6">
          <h2 className="text-xl font-semibold">Les {others.length} autres maisons du catalogue</h2>
          <p className="mt-1 text-sm text-foreground/70">Regardez leurs rendus 3D. Leur plan coté et leur devis sont dans le Catalogue Premium.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {others.map((p) => (
              <Card key={p.slug} id={buyer.intentId} plan={p} locked />
            ))}
          </div>
        </div>
      </section>

      <StickyOfferBar>
        <a href={`${EXTRAIT_SUITE_PATH}?utm_source=mon_extrait&utm_medium=sticky&utm_campaign=extrait_web`} className="btn-cta w-full py-3.5" data-cta="mon_extrait_sticky">
          Débloquer les {total} maisons
        </a>
      </StickyOfferBar>
    </>
  );
}
