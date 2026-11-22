import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_MODELS, EXTRAIT_SLUGS } from "@/lib/lead-offers";
import { countPublishedPlans, formatFcfa, listPublicPlans, type PublicPlan } from "@/lib/plans";
import { cookies } from "next/headers";
import { Countdown } from "@/components/offre/Countdown";
import { FindReservedPrice } from "@/components/offre/FindReservedPrice";
import { deadlineLabel, offerFor, publicOffer, RESERVED_COOKIE, type Offer } from "@/lib/catalogue-offer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le Catalogue Premium complet : la suite de votre extrait",
  robots: { index: false, follow: false },
};

const SHOWN = 40;
/** Les maisons préférées des clients en tête (mêmes que la page de vente du catalogue), puis les modèles en vedette. */
const TOP_SLUGS = ["villa-v3-017", "villa-v4-005", "duplex-d5-012", "villa-v4-036", "villa-v4-032", "duplex-d4-034"];
const millions = (v: number | null) => (v === null ? "" : (v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

const PAYMENTS = [
  { label: "Orange Money", className: "bg-[#FF7900] text-white" },
  { label: "MTN MoMo", className: "bg-[#FFCC00] text-black" },
  { label: "Wave", className: "bg-[#1DC8F2] text-white" },
  { label: "Moov Money", className: "bg-[#0058A8] text-white" },
  { label: "Carte bancaire", className: "bg-white text-foreground" },
];

/** Bandeau du prix réservé (acheteurs reconnus) ou de la promo datée. Rien au prix public : pas de fausse urgence. */
function FlashBadge({ offer, className = "", buyers = "de l'extrait" }: { offer: Offer; className?: string; buyers?: string }) {
  if (offer.tier === "public") return null;
  return (
    <p className={`flash-badge inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg ${className}`}>
      <span aria-hidden>⚡</span> {offer.tier === "promo" ? "Promo spéciale" : `Prix réservé aux acheteurs ${buyers}`}
    </p>
  );
}

function Cta({ id, total, price, className = "" }: { id: string; total: number; price: number; className?: string }) {
  return (
    <GuideCheckoutButton
      offer="catalogue"
      label={<span className="whitespace-nowrap">Débloquer les {total} maisons →</span>}
      title={`Les ${total} villas et duplex avec plan et devis`}
      ctaId={id}
      price={price}
      enabled
      className={`btn-cta w-full whitespace-nowrap px-4 py-4 text-base sm:w-auto sm:px-10 ${className}`}
    />
  );
}

/**
 * Page de la dernière page du PDF de l'extrait (« Voir le Catalogue Premium ») : pour quelqu'un qui a déjà vu le format
 * sur 5 maisons. Pas de nouvelle présentation : les autres maisons, ce qu'il y a en plus, le prix et le paiement tout de suite.
 * Les anciens PDF (lien /catalogue-premium?utm_source=extrait…) arrivent ici aussi (redirection dans /catalogue-premium).
 * ?de=guide : même page pour les acheteurs du guide (message 2 des relances WhatsApp), textes adaptés.
 * Prix (22 nov. 2026) : 29 000 FCFA réservé et compte à rebours réel jusqu'à la date de la personne si on la reconnaît
 * (cookie de son lien personnel ou de sa page merci, ?p=<fiche>), promo datée avec ?promo=, sinon prix public 39 000 FCFA.
 */
export default async function ExtraitSuitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const guide = params.de === "guide";
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const token = one(params.p) || (await cookies()).get(RESERVED_COOKIE)?.value || null;
  const { offer } = await offerFor({ token, promo: one(params.promo) }).catch(() => ({ offer: publicOffer() }));
  const publicPrice = publicOffer().price;
  const [all, count] = await Promise.all([listPublicPlans({ limit: 200 }).catch(() => [] as PublicPlan[]), countPublishedPlans()]);
  const total = count ?? GUIDE.announcedModels;
  const rank = (slug: string) => (TOP_SLUGS.includes(slug) ? TOP_SLUGS.indexOf(slug) : TOP_SLUGS.length);
  const others = all.filter((p) => p.coverImage && !EXTRAIT_SLUGS.includes(p.slug)).sort((a, b) => rank(a.slug) - rank(b.slug));
  const othersCount = Math.max(total - EXTRAIT_MODELS, 0);
  const buyers = guide ? "du guide" : "de l'extrait";
  const price = offer.price;
  return (
    <>
      <section className="bg-primary text-white">
        <div className="container-page max-w-3xl pb-10 pt-6 md:pb-14 md:pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
          <FlashBadge offer={offer} className="mt-6" buyers={buyers} />
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {guide ? `Vous avez vu nos ${total} maisons. Voici leurs plans et leurs devis.` : `Vous avez vu ${EXTRAIT_MODELS} maisons. Voici les ${othersCount} autres.`}
          </h1>
          <p className="mt-3 text-white/85">
            {guide
              ? `Le Catalogue Premium : pour chacune des ${total} villas et duplex de votre guide, le rendu 3D, le plan de distribution coté et le devis poste par poste.`
              : `Le Catalogue Premium : les ${total} villas et duplex au même format que votre extrait. Rendu 3D, plan de distribution coté et devis poste par poste pour chaque maison.`}
          </p>
          {offer.tier === "public" ? (
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-bold">{formatFcfa(price)}</span>
              <span className="pb-1 text-sm text-white/80">paiement unique · version numérique</span>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-white/80">Prix public : {formatFcfa(publicPrice)}</p>
              <p className="mt-1 flex flex-wrap items-end gap-x-3">
                <span className="text-4xl font-bold">{formatFcfa(price)}</span>
                <span className="pb-1 text-sm text-white/80">{offer.tier === "promo" ? "prix de la promo" : "votre prix réservé"} · paiement unique</span>
              </p>
              {offer.until ? (
                <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
                  <p>
                    Valable jusqu&apos;au <strong>{deadlineLabel(offer.until)}</strong>. Ensuite : {formatFcfa(publicPrice)}.
                  </p>
                  <Countdown until={offer.until.toISOString()} className="mt-2 text-lg" />
                </div>
              ) : null}
            </div>
          )}
          <div id="offre-bouton" className="cta-pulse cta-flash mt-5">
            <Cta id="extrait_suite_hero" total={total} price={price} />
          </div>
          {offer.tier === "public" ? <FindReservedPrice className="mt-4 text-white" /> : null}
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {PAYMENTS.map((p) => (
              <li key={p.label} className={`rounded-md px-2 py-1 text-[11px] font-bold ${p.className}`}>
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page max-w-3xl py-10">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-outline bg-outline md:grid-cols-2">
          <div className="bg-white p-5">
            <p className="font-semibold text-foreground/70">{guide ? "Votre guide" : "Votre extrait"}</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/70">
              {(guide
                ? [`${total} maisons en rendu 3D`, "Le budget estimé de chacune", "Sans plan de distribution ni devis"]
                : [`${EXTRAIT_MODELS} maisons`, "Le plan de distribution de chacune", "Le devis poste par poste de chacune"]
              ).map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary/5 p-5">
            <p className="font-semibold text-primary">Le Catalogue Premium</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                `Les ${total} villas et duplex, de toutes les tailles et tous les budgets`,
                "Le plan de distribution coté de chaque niveau",
                "Le devis poste par poste : fondation, élévations, toiture… jusqu'au carrelage",
                "La fiche PDF de chaque modèle, à montrer à votre maçon",
                "Le comparateur : 3 modèles côte à côte",
                "Les nouveaux modèles ajoutés, inclus",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-surface py-10">
        <div className="container-page">
          <FlashBadge offer={offer} className="mb-3" buyers={buyers} />
          <h2 className="text-2xl font-semibold tracking-tight">Les maisons qui vous attendent</h2>
          <p className="mt-1 text-sm text-foreground/70">Chacune avec son plan coté et son devis{guide ? "" : ", comme dans votre extrait"}.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {others.slice(0, SHOWN).map((p) => (
              <div key={p.slug} className="overflow-hidden rounded-xl border border-outline bg-white">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${p.coverImage}?w=480`} alt={`Rendu 3D ${p.code}`} width={480} height={300} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" />
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold">🔒 Plan + devis</span>
                </div>
                <div className="px-2.5 py-2 text-xs">
                  <p className="font-semibold">
                    {p.category === "duplex" ? "Duplex" : "Villa"} {p.code}
                  </p>
                  <p className="text-muted">
                    {p.bedrooms} ch. · {p.surfaceTotal} m²
                    {p.budgetMin && p.budgetMax ? ` · ${millions(p.budgetMin)} à ${millions(p.budgetMax)} M` : ""}
                  </p>
                </div>
              </div>
            ))}
            {others.length > SHOWN ? (
              <div className="grid place-items-center rounded-xl bg-primary p-4 text-center text-white">
                <div>
                  <p className="text-3xl font-bold text-highlight">+{others.length - SHOWN}</p>
                  <p className="text-sm font-semibold">autres maisons dans le catalogue</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="cta-pulse cta-flash mt-6 text-center">
            <Cta id="extrait_suite_grille" total={total} price={price} />
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-10">
        <h2 className="text-xl font-semibold">Questions fréquentes</h2>
        <dl className="mt-4 space-y-4 text-sm">
          {[
            guide
              ? ["Les maisons de mon guide sont-elles dedans ?", `Oui. Le catalogue contient les ${total} maisons de votre guide, chacune avec son plan coté et son devis.`]
              : ["Les maisons de mon extrait sont-elles dedans ?", `Oui. Le catalogue contient les ${total} maisons, dont les ${EXTRAIT_MODELS} de votre extrait.`],
            ["Comment je reçois le catalogue ?", "Juste après le paiement : un accès à votre espace en ligne, avec la fiche PDF de chaque modèle à télécharger."],
            ["Comment payer ?", "Par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire, sur une page de paiement sécurisée."],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-foreground/75">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-primary pb-28 pt-10 text-white sm:pb-10">
        <div className="container-page text-center">
          <FlashBadge offer={offer} className="mb-3" buyers={buyers} />
          <h2 className="text-2xl font-bold">Choisissez votre maison parmi les {total}</h2>
          <p className="mt-2 text-white/80">Regardez le Catalogue Premium de l&apos;intérieur.</p>
          {GUIDE.catalogueVideo ? (
            <video
              className="mx-auto mt-5 aspect-[9/16] w-full max-w-[320px] rounded-2xl bg-black shadow-2xl"
              controls
              playsInline
              preload="none"
              poster={GUIDE.catalogueVideoPoster || undefined}
            >
              <source src={GUIDE.catalogueVideo} type="video/mp4" />
            </video>
          ) : null}
          <div className="cta-pulse cta-flash mt-5">
            <Cta id="extrait_suite_bas" total={total} price={price} />
          </div>
          <p className="mt-8 text-xs text-white/50">© WOOPLANS · wooplans.com</p>
        </div>
      </section>

      <StickyOfferBar whenButtonHidden>
        <div className="cta-pulse cta-flash">
          <Cta id="extrait_suite_sticky" total={total} price={price} className="py-3.5" />
        </div>
      </StickyOfferBar>
    </>
  );
}
