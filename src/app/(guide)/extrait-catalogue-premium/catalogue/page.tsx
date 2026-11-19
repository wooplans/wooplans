import type { Metadata } from "next";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { StickyOfferBar } from "@/components/StickyOfferBar";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_MODELS, EXTRAIT_SLUGS } from "@/lib/lead-offers";
import { countPublishedPlans, formatFcfa, listPublicPlans, type PublicPlan } from "@/lib/plans";
import { cataloguePrice, cataloguePriceBefore } from "@/lib/site";

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

/** Bandeau « Offre flash » réservé aux acheteurs de l'extrait (décision de Tao, 19 nov. : à la place d'un chrono). */
function FlashBadge({ className = "" }: { className?: string }) {
  return (
    <p className={`flash-badge inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg ${className}`}>
      <span aria-hidden>⚡</span> Offre flash · réservée aux acheteurs de l&apos;extrait
    </p>
  );
}

function Cta({ id, total, price, before, className = "" }: { id: string; total: number; price: number; before: number | null; className?: string }) {
  return (
    <GuideCheckoutButton
      offer="catalogue"
      label={<span className="whitespace-nowrap">Débloquer les {total} maisons →</span>}
      title={`Les ${total} villas et duplex avec plan et devis`}
      ctaId={id}
      price={price}
      priceBefore={before}
      enabled
      className={`btn-cta w-full whitespace-nowrap px-4 py-4 text-base sm:w-auto sm:px-10 ${className}`}
    />
  );
}

/**
 * Page de la dernière page du PDF de l'extrait (« Voir le Catalogue Premium ») : pour quelqu'un qui a déjà vu le format
 * sur 5 maisons. Pas de nouvelle présentation : les autres maisons, ce qu'il y a en plus, le prix et le paiement tout de suite.
 * Les anciens PDF (lien /catalogue-premium?utm_source=extrait…) arrivent ici aussi (redirection dans /catalogue-premium).
 */
export default async function ExtraitSuitePage() {
  const [all, count] = await Promise.all([listPublicPlans({ limit: 200 }).catch(() => [] as PublicPlan[]), countPublishedPlans()]);
  const total = count ?? GUIDE.announcedModels;
  const rank = (slug: string) => (TOP_SLUGS.includes(slug) ? TOP_SLUGS.indexOf(slug) : TOP_SLUGS.length);
  const others = all.filter((p) => p.coverImage && !EXTRAIT_SLUGS.includes(p.slug)).sort((a, b) => rank(a.slug) - rank(b.slug));
  const othersCount = Math.max(total - EXTRAIT_MODELS, 0);
  const price = cataloguePrice();
  const before = cataloguePriceBefore();
  const discount = before && before > price ? Math.round((1 - price / before) * 100) : null;
  return (
    <>
      <section className="bg-primary text-white">
        <div className="container-page max-w-3xl pb-10 pt-6 md:pb-14 md:pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
          <FlashBadge className="mt-6" />
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Vous avez vu {EXTRAIT_MODELS} maisons. Voici les {othersCount} autres.
          </h1>
          <p className="mt-3 text-white/85">
            Le Catalogue Premium : les {total} villas et duplex au même format que votre extrait. Rendu 3D, plan de distribution coté et devis poste par
            poste pour chaque maison.
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            {before ? <span className="text-xl text-white/60 line-through">{formatFcfa(before)}</span> : null}
            <span className="text-4xl font-bold">{formatFcfa(price)}</span>
            {discount ? <span className="mb-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-bold text-white">-{discount} %</span> : null}
            <span className="pb-1 text-sm text-white/80">paiement unique · version numérique</span>
          </div>
          <div id="offre-bouton" className="cta-pulse cta-flash mt-5">
            <Cta id="extrait_suite_hero" total={total} price={price} before={before} />
          </div>
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
            <p className="font-semibold text-foreground/70">Votre extrait</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/70">
              {[`${EXTRAIT_MODELS} maisons`, "Le plan de distribution de chacune", "Le devis poste par poste de chacune"].map((t) => (
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
          <FlashBadge className="mb-3" />
          <h2 className="text-2xl font-semibold tracking-tight">Les maisons qui vous attendent</h2>
          <p className="mt-1 text-sm text-foreground/70">Chacune avec son plan coté et son devis, comme dans votre extrait.</p>
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
            <Cta id="extrait_suite_grille" total={total} price={price} before={before} />
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-10">
        <h2 className="text-xl font-semibold">Questions fréquentes</h2>
        <dl className="mt-4 space-y-4 text-sm">
          {[
            ["Les maisons de mon extrait sont-elles dedans ?", `Oui. Le catalogue contient les ${total} maisons, dont les ${EXTRAIT_MODELS} de votre extrait.`],
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
          <FlashBadge className="mb-3" />
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
            <Cta id="extrait_suite_bas" total={total} price={price} before={before} />
          </div>
          <p className="mt-8 text-xs text-white/50">© WOOPLANS · wooplans.com</p>
        </div>
      </section>

      <StickyOfferBar whenButtonHidden>
        <div className="cta-pulse cta-flash">
          <Cta id="extrait_suite_sticky" total={total} price={price} before={before} className="py-3.5" />
        </div>
      </StickyOfferBar>
    </>
  );
}
