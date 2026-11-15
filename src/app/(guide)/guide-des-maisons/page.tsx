import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { GuideModelGrid, type GuideModel } from "@/components/guide/GuideModelGrid";
import { LazyVideo } from "@/components/guide/LazyVideo";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE, GUIDE_PATH, guideEnabled } from "@/lib/guide";
import { formatFcfa, getPublicPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le Guide WooPlans des maisons : villas et duplex avec leur budget",
  description: `${GUIDE.announcedModels} villas et duplex classés par budget, avec la surface et le terrain de chacun. Guide PDF à ${formatFcfa(GUIDE.price)}.`,
  alternates: { canonical: GUIDE_PATH },
};

/**
 * Les maisons préférées des clients (les plus achetées, puis les plus vues en organique : base du site, 14 nov. 2026).
 * Même message que la pub qui vend le mieux (« Les maisons préférées de nos clients avec leur budget »).
 */
const SHOWCASE = ["villa-v3-017", "villa-v4-005", "duplex-d5-012", "villa-v4-036", "villa-v4-032", "duplex-d4-034"];

const FOR_YOU = [
  "Vous avez un terrain, ou vous êtes en train d'en acheter un",
  "Vous voulez construire dans les 12 prochains mois",
  "Vous voulez savoir ce que votre budget permet avant de payer un architecte",
  "Vous hésitez entre une villa et un duplex, ou sur le nombre de chambres",
];
const NOT_FOR_YOU = [
  "Vous cherchez les plans complets pour lancer le chantier demain (c'est notre service de plans complets)",
  "Vous cherchez une maison déjà construite à acheter ou à louer",
  "Vous cherchez des idées de décoration intérieure",
];

const PAYMENTS = [
  { label: "Orange Money", className: "bg-[#FF7900] text-white" },
  { label: "MTN MoMo", className: "bg-[#FFCC00] text-black" },
  { label: "Wave", className: "bg-[#1DC8F2] text-white" },
  { label: "Moov Money", className: "bg-[#0058A8] text-white" },
  { label: "Carte bancaire", className: "bg-white text-foreground" },
];

function Cta({ id, className = "" }: { id: string; className?: string }) {
  return (
    <GuideCheckoutButton
      label={`Recevoir le guide · ${formatFcfa(GUIDE.price)}`}
      ctaId={id}
      price={GUIDE.price}
      enabled={guideEnabled()}
      className={`btn-cta w-full py-4 text-base sm:w-auto sm:px-10 ${className}`}
    />
  );
}

function Payments({ dark = false }: { dark?: boolean }) {
  return (
    <div className="mt-4">
      <p className={`text-xs ${dark ? "text-white/70" : "text-muted"}`}>🔒 Paiement sécurisé · guide reçu tout de suite, par email et sur WhatsApp</p>
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

/** Page de vente du Guide WooPlans des maisons (lead magnet payant, src/config/guide.json). Sans en-tête ni pied de page. */
export default async function GuidePage() {
  const plans = (await Promise.all(SHOWCASE.map((s) => getPublicPlan(s).catch(() => null)))).filter((p) => p?.coverImage);
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
  const others = GUIDE.announcedModels - models.length;

  return (
    <>
      {/* Hero : même message que la pub qui vend, la grille des maisons tout de suite, puis le bouton. */}
      <section className="bg-primary text-white">
        <div className="container-page pb-10 pt-5 md:grid md:grid-cols-[1fr_1.1fr] md:items-center md:gap-10 md:pb-16 md:pt-10">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-highlight">Guide PDF · {formatFcfa(GUIDE.price)}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">Les maisons préférées de nos clients, avec leur budget</h1>
            <p className="mt-3 max-w-xl text-white/85">
              Elles et {others} autres villas et duplex sont classées par budget dans le guide, avec la surface et le terrain de chacune.
            </p>
            <div className="mt-5 md:hidden">
              <GuideModelGrid models={models} price={GUIDE.price} enabled={guideEnabled()} compact />
              <p className="mt-2 text-center text-xs text-white/70">Touchez une maison pour la voir en grand</p>
            </div>
            <div id="offre-bouton" className="cta-pulse mt-6">
              <Cta id="guide_hero" />
            </div>
            <Payments dark />
          </div>
          <div className="mt-8 hidden md:block">
            <GuideModelGrid models={models} price={GUIDE.price} enabled={guideEnabled()} compact />
            <p className="mt-2 text-center text-xs text-white/70">Cliquez sur une maison pour la voir en grand</p>
          </div>
        </div>
      </section>

      {/* Le guide dans le téléphone : vidéo chargée seulement quand elle arrive à l'écran. */}
      <section className="container-page grid items-center gap-8 py-12 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Le guide, dans votre téléphone</h2>
          <ul className="mt-5 space-y-2">
            {[
              `${GUIDE.announcedModels} villas et duplex, de moins de 15 à plus de 70 millions`,
              "Pour chacune : chambres, niveaux, surface et terrain conseillé",
              "Le tableau « Quel modèle pour mon terrain ? », de 200 à 750 m²",
              "Les 5 décisions à prendre avant de construire",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden md:block">
            <Cta id="guide_video" />
          </div>
        </div>
        {GUIDE.video ? (
          <div className="mx-auto w-full max-w-[280px]">
            <LazyVideo
              src={GUIDE.video}
              poster={GUIDE.videoPoster || undefined}
              className="aspect-[9/20] w-full rounded-[2rem] border-[6px] border-black bg-black object-cover shadow-2xl"
            />
          </div>
        ) : null}
      </section>

      {/* Pour qui ? */}
      <section className="bg-surface py-12">
        <div className="container-page">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Ce guide est-il fait pour vous ?</h2>
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

      {/* Questions */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Questions fréquentes</h2>
        <dl className="mt-5 space-y-5">
          {[
            ["Comment payer ?", "Par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire, sur une page de paiement sécurisée."],
            ["Comment je reçois le guide ?", "Juste après le paiement : il s'ouvre à l'écran, il arrive par email et sur votre WhatsApp."],
            ["Est-ce un livre imprimé ?", "Non, c'est un PDF à lire sur votre téléphone ou votre ordinateur."],
            ["Le guide contient-il les plans cotés et les devis détaillés ?", "Non. Il montre chaque maison, ses surfaces et son budget estimé. Les plans cotés et les devis poste par poste sont dans le Catalogue Premium."],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-foreground/75">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Dernier appel */}
      <section className="bg-primary pb-28 pt-12 text-white sm:pb-12">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Trouvez la maison à votre portée</h2>
          <p className="mt-2 text-white/80">{GUIDE.announcedModels} villas et duplex avec leur budget, dans votre téléphone.</p>
          <div className="mt-6">
            <Cta id="guide_bas" />
          </div>
          <p className="mt-8 text-xs text-white/50">© WOOPLANS · wooplans.com</p>
        </div>
      </section>

      {/* Barre d'achat mobile : visible dès que le bouton du haut n'est pas à l'écran. */}
      <StickyOfferBar whenButtonHidden>
        <div className="cta-pulse">
          <Cta id="guide_sticky" className="py-3.5" />
        </div>
      </StickyOfferBar>
    </>
  );
}
