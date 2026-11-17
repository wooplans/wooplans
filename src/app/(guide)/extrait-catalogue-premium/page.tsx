import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { GuideModelGrid, type GuideModel } from "@/components/guide/GuideModelGrid";
import { ModelRail } from "@/components/guide/ModelRail";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_PATH, EXTRAIT_SLUGS, LEAD_OFFERS } from "@/lib/lead-offers";
import { countPublishedPlans, formatFcfa, getPlanTeaser, getPublicPlan, listPublicPlans, type PublicPlan } from "@/lib/plans";
import { cataloguePrice, cataloguePriceBefore } from "@/lib/site";

export const dynamic = "force-dynamic";

const OFFER = LEAD_OFFERS.extrait;

export const metadata: Metadata = {
  title: "Extrait du Catalogue Premium : 5 maisons avec leur plan et leur devis",
  description: `5 villas et duplex du Catalogue Premium WooPlans, avec le plan de distribution et le devis poste par poste de chacun. PDF à ${formatFcfa(OFFER.price)}.`,
  alternates: { canonical: EXTRAIT_PATH },
  robots: { index: false, follow: false },
};

const INSIDE = [
  "Le rendu 3D de la maison",
  "Le plan de distribution coté de chaque niveau",
  "La surface de chaque pièce",
  "Le devis poste par poste : fondation, élévations, toiture… jusqu'au carrelage",
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
/** Les maisons préférées des clients : les mêmes que dans le hero du guide (c'est ce qui vend). */
const SHOWCASE = ["villa-v3-017", "villa-v4-005", "duplex-d5-012", "villa-v4-036", "villa-v4-032", "duplex-d4-034"];
const RAIL_SIZE = 20;

const toModel = (p: PublicPlan): GuideModel => ({
  slug: p.slug,
  code: p.code,
  category: p.category,
  bedrooms: p.bedrooms,
  levels: p.levels,
  surfaceTotal: p.surfaceTotal,
  landArea: p.landArea ?? null,
  budgetMin: p.budgetMin,
  budgetMax: p.budgetMax,
  image: p.coverImage!,
});

export default async function ExtraitPage() {
  const [plans, all, total] = await Promise.all([
    Promise.all(SHOWCASE.map((s) => getPublicPlan(s).catch(() => null))),
    listPublicPlans({ limit: 200 }).catch(() => [] as PublicPlan[]),
    countPublishedPlans(),
  ]);
  // Top 20 (comme la page de vente du catalogue) : les préférées d'abord, puis les modèles en vedette.
  const rank = (slug: string) => (SHOWCASE.includes(slug) ? SHOWCASE.indexOf(slug) : SHOWCASE.length);
  const rail = all.filter((p) => p.coverImage).sort((a, b) => rank(a.slug) - rank(b.slug)).slice(0, RAIL_SIZE).map(toModel);
  const modelsTotal = total ?? GUIDE.announcedModels;
  const before = cataloguePriceBefore();
  const models = (plans.filter((p) => p?.coverImage) as PublicPlan[]).map(toModel);
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
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">Voyez le plan et le devis de 5 maisons du Catalogue Premium</h1>
            <p className="mt-3 max-w-xl text-white/85">
              Le Catalogue Premium réunit {modelsTotal} villas et duplex avec leur plan de distribution et leur devis poste par poste. Découvrez-le avec 5
              maisons complètes, pour {formatFcfa(OFFER.price)}.
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

      {/* Le catalogue entier existe : la vidéo du Catalogue Premium, puis l'extrait comme première étape (prépare l'achat du catalogue). */}
      <section className="container-page grid items-center gap-8 py-12 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">Le Catalogue Premium</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{modelsTotal} maisons, chacune avec son plan et son devis</h2>
          <p className="mt-3 text-foreground/75">
            Le Catalogue Premium contient {modelsTotal} villas et duplex. Pour chacun : le rendu 3D, le plan de distribution coté et le devis poste par
            poste, de la fondation au carrelage.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-outline bg-surface p-4">
              <p className="text-sm font-semibold text-foreground/70">Le catalogue complet</p>
              <p className="mt-1 text-lg font-bold">{modelsTotal} maisons</p>
              <p className="text-sm text-foreground/70">
                {before ? <s className="mr-1">{formatFcfa(before)}</s> : null}
                {formatFcfa(cataloguePrice())}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-secondary bg-secondary/5 p-4">
              <p className="text-sm font-semibold text-secondary">L&apos;extrait, pour commencer</p>
              <p className="mt-1 text-lg font-bold">5 maisons complètes</p>
              <p className="text-sm font-bold">{formatFcfa(OFFER.price)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-foreground/70">Voyez de vos yeux un vrai plan avec son devis avant de choisir votre maison.</p>
          <div className="mt-6 hidden md:block">
            <Cta id="extrait_video" />
          </div>
        </div>
        {GUIDE.catalogueVideo ? (
          <video
            className="mx-auto aspect-[9/16] w-full max-w-[320px] rounded-2xl bg-black shadow-2xl"
            controls
            playsInline
            preload="none"
            poster={GUIDE.catalogueVideoPoster || undefined}
          >
            <source src={GUIDE.catalogueVideo} type="video/mp4" />
          </video>
        ) : null}
      </section>

      {/* Notre top 20, en grand (même galerie que la page du catalogue). */}
      {rail.length > 0 ? (
        <section className="bg-surface py-12">
          <div className="container-page">
            <p className="eyebrow">Dans le Catalogue Premium</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Notre top 20, en grand</h2>
            <p className="mt-2 text-foreground/75">Les maisons préférées de nos clients. Touchez une maison pour la voir en grand.</p>
            <div className="mt-6">
              <ModelRail models={rail} total={modelsTotal} price={OFFER.price} enabled={enabled()} />
            </div>
            <div className="mt-6 text-center">
              <Cta id="extrait_top20" />
            </div>
          </div>
        </section>
      ) : null}

      {/* Ce que contient chaque page, avec un vrai plan coté flouté. */}
      <section className="container-page grid items-center gap-8 py-12 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Dans votre extrait, pour chaque maison</h2>
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
            ["Les 5 maisons de l'extrait sont-elles celles de la page ?", "L'extrait contient 5 maisons de budgets différents, de la villa au duplex, et la liste illustrée de tous les autres modèles du catalogue."],
            ["Et les autres modèles ?", `Le Catalogue Premium contient les ${modelsTotal} villas et duplex au même format, avec leur plan et leur devis poste par poste, pour ${formatFcfa(cataloguePrice())}.`],
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
