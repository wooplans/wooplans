import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExtraitOffer } from "@/components/extrait/ExtraitOffer";
import { ExtraitTracker, TrackedLink } from "@/components/extrait/ExtraitTracker";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanSpecs } from "@/components/PlanSpecs";
import { FloorPlanViewer } from "@/components/premium/FloorPlanViewer";
import { offerFor, publicOffer } from "@/lib/catalogue-offer";
import { extraitBuyer, isUnlocked } from "@/lib/extrait-web";
import { maskedAmount } from "@/lib/extrait-web-rules";
import { EXTRAIT_SLUGS, EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { CATEGORY_LABELS, countPublishedPlans, formatFcfa, getPremiumPlan, getPublicPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Votre Extrait du Catalogue Premium", robots: { index: false, follow: false } };

const OFFER_HREF = `${EXTRAIT_SUITE_PATH}?utm_source=mon_extrait&utm_medium=verrou&utm_campaign=extrait_web`;

function Lock({ id, slug, label, className = "" }: { id: string; slug: string; label: string; className?: string }) {
  return (
    <TrackedLink
      id={id}
      type="locked"
      slug={slug}
      href={OFFER_HREF}
      className={`absolute inset-0 grid place-items-center bg-white/30 text-center backdrop-blur-[1px] ${className}`}
    >
      <span className="rounded-xl bg-white/95 px-4 py-3 shadow-lg">
        <span className="block text-2xl" aria-hidden>
          🔒
        </span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-primary underline">Débloquer avec le Catalogue Premium</span>
      </span>
    </TrackedLink>
  );
}

/**
 * Une maison de l'extrait en ligne. Débloquée (une des 5) : rendus, plans cotés filigranés au nom de l'acheteur,
 * pièces, devis poste par poste et fiche PDF. Verrouillée : rendus visibles ; plan flouté par le serveur, montants du
 * devis jamais envoyés, fiche PDF au cadenas ; chaque clic sur un cadenas mène au prix du catalogue (et compte).
 */
export default async function ExtraitModelPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  const [buyer, full, pub, count] = await Promise.all([extraitBuyer(id), getPremiumPlan(slug), getPublicPlan(slug), countPublishedPlans()]);
  if (!buyer || !full || !pub) notFound();
  const unlocked = isUnlocked(slug);
  const { offer } = await offerFor({ email: buyer.email }).catch(() => ({ offer: publicOffer() }));
  const total = count ?? 100;
  const images = [full.coverImage, ...full.renders.filter((r) => r !== full.coverImage)].filter(Boolean);
  const lotsTotal = full.estimateLots.reduce((sum, lot) => sum + lot.amount, 0);
  const position = EXTRAIT_SLUGS.indexOf(slug);
  const next = unlocked ? EXTRAIT_SLUGS[(position + 1) % EXTRAIT_SLUGS.length] : null;

  return (
    <div className="container-page max-w-5xl py-6 pb-28">
      <ExtraitTracker id={buyer.intentId} slug={slug} />
      <Link href={`/mon-extrait/${buyer.intentId}`} className="text-sm text-muted hover:text-primary">
        ← Mon extrait
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <PlanGallery images={images} alt={full.name} />
        <div>
          <p className="eyebrow">
            {CATEGORY_LABELS[full.category]} · Réf. {full.code}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{full.name}</h1>
          <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${unlocked ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {unlocked ? "✓ Dans votre extrait : plan et devis débloqués" : "🔒 Plan et devis dans le Catalogue Premium"}
          </p>
          <div className="mt-4 rounded-2xl bg-primary/5 p-4">
            <p className="text-sm text-muted">Devis estimatif de construction</p>
            <p className="mt-1 text-2xl font-bold text-primary">{unlocked ? formatFcfa(full.estimateTotal || lotsTotal) : maskedAmount(full.estimateTotal || lotsTotal)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {unlocked ? (
              <a href={`/api/extrait/${buyer.intentId}/fiche/${slug}`} className="btn-ghost" data-pdf={full.code}>
                Télécharger la fiche PDF
              </a>
            ) : (
              <TrackedLink id={buyer.intentId} type="locked" slug={slug} href={OFFER_HREF} className="btn-ghost opacity-80">
                🔒 Fiche PDF
              </TrackedLink>
            )}
          </div>
          <div className="mt-4">
            <PlanSpecs plan={pub} />
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Plans cotés</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {full.floorPlans.map((key, i) =>
            unlocked ? (
              key.toLowerCase().endsWith(".pdf") ? (
                <p key={key} className="card p-5 text-sm">
                  Niveau {i + 1} : dans la fiche PDF.
                </p>
              ) : (
                <FloorPlanViewer key={key} src={`/api/extrait/${buyer.intentId}/plan/${slug}/${i + 1}`} alt={`${full.name} — plan coté ${i + 1}`} />
              )
            ) : (
              <div key={key} className="relative overflow-hidden rounded-xl border border-outline bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/apercu/fiche/${slug}?doux=1&n=${i + 1}`} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <Lock id={buyer.intentId} slug={slug} label={full.levels > 1 ? `Plan coté, niveau ${i + 1}` : "Plan coté"} />
              </div>
            ),
          )}
        </div>
      </section>

      {full.estimateLots.length > 0 ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-xl font-semibold">Devis poste par poste</h2>
          <div className="card relative mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {full.estimateLots.map((lot) => (
                  <tr key={lot.label} className="border-t border-outline first:border-t-0">
                    <td className="px-4 py-2">{lot.label}</td>
                    <td className={`px-4 py-2 text-right font-medium ${unlocked ? "" : "select-none text-foreground/40 blur-[2px]"}`}>
                      {unlocked ? formatFcfa(lot.amount) : maskedAmount(lot.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary bg-primary/5">
                  <td className="px-4 py-3 font-semibold">Total</td>
                  <td className={`px-4 py-3 text-right font-bold text-primary ${unlocked ? "" : "select-none blur-[2px]"}`}>{unlocked ? formatFcfa(lotsTotal) : maskedAmount(lotsTotal)}</td>
                </tr>
              </tbody>
            </table>
            {unlocked ? null : <Lock id={buyer.intentId} slug={slug} label="Montants du devis" className="bg-transparent backdrop-blur-0" />}
          </div>
        </section>
      ) : null}

      {unlocked && full.rooms.length > 0 ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-xl font-semibold">Pièces et surfaces</h2>
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {full.rooms.map((room, i) => (
                  <tr key={`${room.name}-${i}`} className="border-t border-outline first:border-t-0">
                    <td className="px-4 py-2">{room.level ? `${room.name} (${room.level})` : room.name}</td>
                    <td className="px-4 py-2 text-right font-medium">{room.area} m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-10 max-w-2xl">
        <ExtraitOffer id={buyer.intentId} offer={offer} publicPrice={publicOffer().price} total={total} />
      </section>

      {next ? (
        <p className="mt-6">
          <Link href={`/mon-extrait/${buyer.intentId}/${next}`} className="font-semibold text-primary">
            Maison suivante de votre extrait →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
