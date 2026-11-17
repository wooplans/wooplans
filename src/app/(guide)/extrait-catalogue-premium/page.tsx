import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { GuideModelGrid, type GuideModel } from "@/components/guide/GuideModelGrid";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_PATH, EXTRAIT_SLUGS, LEAD_OFFERS } from "@/lib/lead-offers";
import { formatFcfa, getPlanTeaser, getPublicPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const OFFER = LEAD_OFFERS.extrait;

export const metadata: Metadata = {
  title: "Extrait du Catalogue Premium : 5 maisons avec leur plan et leur devis",
  description: `5 villas et duplex du Catalogue Premium WooPlans, avec le plan de distribution et le devis détaillé de chacun. PDF à ${formatFcfa(OFFER.price)}.`,
  alternates: { canonical: EXTRAIT_PATH },
  robots: { index: false, follow: false },
};

const INSIDE = [
  "Le rendu 3D de la maison",
  "Le plan de distribution coté de chaque niveau",
  "La surface de chaque pièce",
  "Le devis détaillé, poste par poste : fondation, élévations, toiture… jusqu'au carrelage",
  "Le terrain conseillé et le budget de construction",
];

const FOR_YOU = [
  "Vous avez un terrain, ou vous souhaitez acheter un terrain",
  "Vous voulez voir à quoi ressemble un vrai plan avec son devis avant de vous décider",
  "Vous voulez savoir ce que coûte chaque étape du chantier",
];
const NOT_FOR_YOU = ["Vous n'avez pas de projet de construction", "Vous cherchez une maison déjà construite à acheter ou à louer"];

const PAYMENTS = [
  { label: "Orange Money", className: "bg-[#FF7900] text-white" },
  { label: "MTN MoMo", className: "bg-[#FFCC00] text-black" },
  { label: "Wave", className: "bg-[#1DC8F2] text-white" },
  { label: "Moov Money", className: "bg-[#0058A8] text-white" },
  { label: "Carte bancaire", className: "bg-white text-foreground" },
];

const enabled = () => OFFER.productId !== "";

function Cta({ id, className = "" }: { id: string; className?: string }) {
  return (
    <GuideCheckoutButton
      offer="extrait"
      label={`Recevoir l'extrait · ${formatFcfa(OFFER.price)}`}
      ctaId={id}
      price={OFFER.price}
      enabled={enabled()}
      className={`btn-cta w-full py-4 text-base sm:w-auto sm:px-10 ${className}`}
    />
  );
}

function Payments({ dark = false }: { dark?: boolean }) {
  return (
    <div className="mt-4">
      <p className={`text-xs ${dark ? "text-white/70" : "text-muted"}`}>🔒 Paiement sécurisé · PDF reçu tout de suite, par email et sur WhatsApp</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {PAYMENTS.map((p) => (
          <li key={p.label} className={`rounded-md px-2 py-1 text-[11px] font-bold ${p.className}`}>
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Page de vente de l'Extrait du Catalogue Premium (test du 17 nov. 2026, en parallèle du guide) : les pages A3 du
 * catalogue de 5 maisons. Même pub, même paiement, même suite que le guide (src/lib/lead-offers.ts).
 */
export default async function ExtraitPage() {
  const plans = (await Promise.all(EXTRAIT_SLUGS.map((s) => getPublicPlan(s).catch(() => null)))).filter((p) => p?.coverImage);
  const models: GuideModel[] = plans.map((p) => ({
    slug: p!.slug,
    code: p!.code,
    category: p!.category,
    bedrooms: p!.bedrooms,
    levels: p!.levels,
    surfaceTotal: p!.surfaceTotal,
    landArea: p!.landArea ?? null,
    budgetMin: p!.budgetMin,
    budgetMax: p!.budgetMax,
    image: p!.coverImage!,
  }));
  // Aperçu flouté d'un vrai plan coté (l'original n'est jamais transmis) : un duplex, pour montrer les deux niveaux.
  const previewSlug = EXTRAIT_SLUGS.find((s) => s.startsWith("duplex")) ?? EXTRAIT_SLUGS[0];
  const teaser = previewSlug ? await getPlanTeaser(previewSlug).catch(() => null) : null;

  return (
    <>
      <section className="bg-primary text-white">
        <div className="container-page pb-10 pt-5 md:grid md:grid-cols-[1fr_1.1fr] md:items-center md:gap-10 md:pb-16 md:pt-10">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-highlight">Extrait du Catalogue Premium · {formatFcfa(OFFER.price)}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">5 maisons avec leur plan et leur devis</h1>
            <p className="mt-3 max-w-xl text-white/85">
              Les pages du Catalogue Premium de 5 villas et duplex de budgets différents : le plan de distribution et le devis détaillé de chacun.
            </p>
            <div className="mt-5 md:hidden">
              <GuideModelGrid models={models} price={OFFER.price} enabled={enabled()} compact offer="extrait" />
              <p className="mt-2 text-center text-xs text-white/70">Touchez une maison pour la voir en grand</p>
            </div>
            <div id="offre-bouton" className="cta-pulse mt-6">
              <Cta id="extrait_hero" />
            </div>
            <Payments dark />
          </div>
          <div className="mt-8 hidden md:block">
            <GuideModelGrid models={models} price={OFFER.price} enabled={enabled()} compact offer="extrait" />
            <p className="mt-2 text-center text-xs text-white/70">Cliquez sur une maison pour la voir en grand</p>
          </div>
        </div>
      </section>

      {/* Ce que contient chaque page, avec un vrai plan coté flouté. */}
      <section className="container-page grid items-center gap-8 py-12 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Pour chaque maison</h2>
          <ul className="mt-5 space-y-2">
            {INSIDE.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-foreground/70">Les mêmes pages que dans le Catalogue Premium, au format PDF, à lire sur votre téléphone.</p>
          <div className="mt-6 hidden md:block">
            <Cta id="extrait_contenu" />
          </div>
        </div>
        {teaser && teaser.floorPlans.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {teaser.floorPlans.map((n) => (
              <figure key={n} className="relative overflow-hidden rounded-2xl border border-outline bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/apercu/fiche/${previewSlug}?n=${n}&doux=1`} alt="Aperçu flouté d'un plan coté" loading="lazy" className="aspect-[4/3] w-full object-contain p-1" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 via-white/25 to-white/85" aria-hidden />
                <figcaption className="absolute inset-x-0 bottom-3 text-center">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">Plan coté : en clair dans l&apos;extrait</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-surface py-12">
        <div className="container-page">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Cet extrait est-il fait pour vous ?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
              <p className="text-lg font-semibold text-primary">Oui, si :</p>
              <ul className="mt-4 space-y-3">
                {FOR_YOU.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-sm text-white" aria-hidden>
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-6">
              <p className="text-lg font-semibold text-foreground/70">Non, si :</p>
              <ul className="mt-4 space-y-3 text-foreground/70">
                {NOT_FOR_YOU.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground/15 text-sm" aria-hidden>
                      ✕
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Questions fréquentes</h2>
        <dl className="mt-5 space-y-5">
          {[
            ["Comment payer ?", "Par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire, sur une page de paiement sécurisée."],
            ["Comment je reçois l'extrait ?", "Juste après le paiement : il s'ouvre à l'écran, il arrive par email et sur votre WhatsApp."],
            ["Est-ce un livre imprimé ?", "Non, c'est un PDF à lire sur votre téléphone ou votre ordinateur."],
            ["Et les autres modèles ?", `Le Catalogue Premium contient les ${GUIDE.announcedModels} villas et duplex au même format, avec leur plan et leur devis.`],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-foreground/75">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-primary pb-28 pt-12 text-white sm:pb-12">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Voyez un vrai plan avec son devis</h2>
          <p className="mt-2 text-white/80">5 maisons du Catalogue Premium, dans votre téléphone.</p>
          <div className="mt-6">
            <Cta id="extrait_bas" />
          </div>
          <p className="mt-8 text-xs text-white/50">© WOOPLANS · wooplans.com</p>
        </div>
      </section>

      <StickyOfferBar whenButtonHidden>
        <div className="cta-pulse">
          <Cta id="extrait_sticky" className="py-3.5" />
        </div>
      </StickyOfferBar>
    </>
  );
}
