import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE, GUIDE_PATH, guideEnabled } from "@/lib/guide";
import { formatFcfa, getPublicPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le Guide WooPlans des maisons : villas et duplex avec leur budget",
  description: `${GUIDE.announcedModels} villas et duplex classés par budget, avec la surface et le terrain de chacun. Guide PDF à ${formatFcfa(GUIDE.price)}.`,
  alternates: { canonical: GUIDE_PATH },
};

/** Modèles montrés sur la page : les plus achetés, puis les plus vus en organique (base du site, 14 nov. 2026). */
const SHOWCASE = ["villa-v3-017", "duplex-d5-012", "villa-v4-005", "villa-v4-036", "duplex-d4-034", "villa-v3-037"];

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

const millions = (v: number | null) => (v === null ? "" : (v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

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

/** Page de vente du Guide WooPlans des maisons (lead magnet payant, src/config/guide.json). Sans en-tête ni pied de page. */
export default async function GuidePage() {
  const plans = (await Promise.all(SHOWCASE.map((s) => getPublicPlan(s).catch(() => null)))).filter((p) => p?.coverImage);

  return (
    <>
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="container-page grid items-center gap-8 pb-12 pt-6 md:grid-cols-[1.15fr_1fr] md:pb-16 md:pt-10">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-9 w-auto" />
            <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-highlight">Guide PDF · {formatFcfa(GUIDE.price)}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">Quelle maison pouvez-vous construire avec votre budget ?</h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              {GUIDE.announcedModels} villas et duplex classés par budget, avec la surface et le terrain de chacun.
            </p>
            <div id="offre-bouton" className="cta-pulse mt-7">
              <Cta id="guide_hero" />
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              <li>📱 PDF sur votre téléphone</li>
              <li>💳 Mobile Money ou carte</li>
              <li>⚡ Reçu tout de suite</li>
            </ul>
          </div>
          {GUIDE.video ? (
            <div className="mx-auto w-full max-w-[300px] md:max-w-[340px]">
              <video
                className="aspect-[9/20] w-full rounded-[2rem] border-[6px] border-black bg-black object-cover shadow-2xl"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={GUIDE.videoPoster || undefined}
              >
                <source src={GUIDE.video} type="video/mp4" />
              </video>
            </div>
          ) : null}
        </div>
      </section>

      {/* Exemples */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Chaque maison avec son budget</h2>
        <p className="mt-2 text-foreground/70">Quelques modèles parmi les {GUIDE.announcedModels} du guide, parmi les préférés de nos clients :</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <figure key={p!.slug} className="overflow-hidden rounded-xl bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${p!.coverImage}?w=480`} alt={`Rendu 3D ${p!.name}`} loading="lazy" className="aspect-video w-full object-cover" />
              <figcaption className="px-3 py-2 text-xs">
                <span className="font-semibold">{p!.code}</span> · {p!.bedrooms} ch. · {p!.surfaceTotal} m²
                <span className="block font-semibold text-primary">
                  {millions(p!.budgetMin)} à {millions(p!.budgetMax)} M FCFA
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <ul className="mt-8 grid gap-2 md:grid-cols-2">
          {[
            "Les maisons classées par budget : de moins de 15 à plus de 70 millions",
            "Pour chacune : chambres, niveaux, surface et terrain conseillé",
            "Le tableau « Quel modèle pour mon terrain ? », de 200 à 750 m²",
            "Les 5 décisions à prendre avant de construire",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-primary" aria-hidden>✓</span>
              {t}
            </li>
          ))}
        </ul>
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
            ["Comment je reçois le guide ?", "Juste après le paiement : il s'ouvre à l'écran, il arrive par email et sur votre WhatsApp."],
            ["Est-ce un livre imprimé ?", "Non, c'est un PDF à lire sur votre téléphone ou votre ordinateur."],
            ["Le guide contient-il les plans cotés et les devis détaillés ?", "Non. Il montre chaque maison, ses surfaces et son budget estimé. Les plans cotés et les devis poste par poste sont dans le Catalogue Premium."],
            ["Comment payer ?", "Par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire."],
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

      {/* Barre d'achat mobile : apparaît une fois le bouton du haut dépassé. */}
      <StickyOfferBar>
        <div className="cta-pulse">
          <Cta id="guide_sticky" className="py-3.5" />
        </div>
      </StickyOfferBar>
    </>
  );
}
