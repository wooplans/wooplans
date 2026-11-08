"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocalPrice } from "@/components/LocalPrice";
import { rememberPromo } from "@/components/PromoCode";
import { formatLocalPrice } from "@/lib/local-price";
import { formatBudgetRange, levelsLabel } from "@/lib/plan-format";
import { PROMO_GUIDE_IMAGE, PROMO_GUIDE_PATH, UPSELL_CATALOGUE_PATH, formatDeadline, upsellPath, upsellPrice } from "@/lib/upsell";

export type UpsellData = {
  code: string;
  /** ISO : 24 h après le paiement. */
  deadline: string;
  plans: {
    slug: string;
    code: string;
    name: string;
    coverImage: string | null;
    bedrooms: number;
    surfaceTotal: number;
    levels: number;
    budgetMin: number | null;
    budgetMax: number | null;
  }[];
};

function useCountdown(deadline: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, deadline - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    left,
    parts: [Math.floor(left / 3600_000), Math.floor((left % 3600_000) / 60_000), Math.floor((left % 60_000) / 1000)].map(pad),
  };
}

/** Page /merci : offre aux clients du plan et devis (plans supplémentaires avec le code, pendant 24 h). */
export function UpsellOffer({ upsell }: { upsell: UpsellData }) {
  const deadline = new Date(upsell.deadline).getTime();
  const { left, parts } = useCountdown(deadline);
  const local = useLocalPrice();
  const promo = upsellPrice(local);
  const price = `${promo.approx ? "≈ " : ""}${formatLocalPrice(promo.amount, promo.currency)}`;
  const fullPrice = formatLocalPrice(local.amount, local.currency);
  const [copied, setCopied] = useState(false);

  // Le code suit le client sur tout le site : il sera rempli dans chaque formulaire.
  useEffect(() => rememberPromo(upsell.code), [upsell.code]);

  if (left <= 0) return null;
  return (
    <section className="mt-10 overflow-hidden rounded-2xl border-2 border-[#F08A2E] bg-[#FFF7EF] text-left">
      <div className="bg-secondary px-5 py-3 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-widest">Offre réservée aux clients · 24 h seulement</p>
        <p className="upsell-timer mt-1 inline-block font-mono text-3xl font-extrabold tabular-nums" aria-live="off">
          {parts[0]}:{parts[1]}:{parts[2]}
        </p>
        <p className="text-xs opacity-90">jusqu&apos;au {formatDeadline(new Date(deadline))} (heure du Cameroun)</p>
      </div>
      <div className="p-5 md:p-6">
        <h2 className="text-center text-xl font-bold md:text-2xl">
          Chaque plan et devis supplémentaire à <span className="text-secondary">{price}</span>{" "}
          <span className="whitespace-nowrap text-base font-semibold text-foreground/50">
            au lieu de <s>{fullPrice}</s>
          </span>
        </h2>
        <p className="mt-2 text-center text-foreground/75">
          Vous hésitez encore entre plusieurs modèles ? Comparez-les avec leurs plans et devis détaillés. Prenez-en autant que vous voulez.
        </p>

        <div className="mx-auto mt-5 max-w-xs rounded-2xl border-2 border-dashed border-primary bg-surface p-4 text-center">
          <p className="text-xs text-muted">Votre code</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em] text-primary">{upsell.code}</p>
          <button
            type="button"
            className="mt-1 text-sm font-semibold text-primary hover:underline"
            onClick={() => {
              void navigator.clipboard?.writeText(upsell.code);
              setCopied(true);
            }}
          >
            {copied ? "Code copié ✓" : "Copier le code"}
          </button>
          <p className="mt-1 text-xs text-muted">Déjà rempli quand vous ouvrez un modèle ci-dessous.</p>
        </div>

        {upsell.plans.length > 0 ? (
          <>
            <p className="mt-6 font-semibold">Modèles proches du vôtre :</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {upsell.plans.map((p) => {
                const budget = formatBudgetRange(p.budgetMin, p.budgetMax);
                return (
                  <Link key={p.slug} href={upsellPath(p.slug)} className="card group flex flex-col overflow-hidden hover:shadow-lg" data-cta="upsell_plan" data-plan={p.slug}>
                    <div className="aspect-video overflow-hidden bg-outline/40">
                      {p.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverImage} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.code} · {p.bedrooms} ch. · {p.surfaceTotal} m² · {levelsLabel(p.levels)}
                        {budget ? ` · ${budget}` : ""}
                      </p>
                      <p className="mt-auto pt-3 text-sm font-bold text-secondary">
                        Obtenir à {price} <s className="font-medium text-foreground/40">{fullPrice}</s> →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}

        <Link href={UPSELL_CATALOGUE_PATH} className="btn-cta mt-6 w-full py-4 text-base" data-cta="upsell_catalogue">
          Voir tous les modèles avec mon code
        </Link>

        <details className="mt-5 rounded-xl bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Comment utiliser mon code ?</summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/80">
            <li>Ouvrez le modèle qui vous intéresse.</li>
            <li>Touchez « Recevoir mon plan et devis ».</li>
            <li>Touchez « Code promo » et tapez {upsell.code} (il est déjà rempli si vous venez de cette page).</li>
            <li>Touchez « Procéder au paiement » : le prix réduit s&apos;affiche au paiement.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PROMO_GUIDE_IMAGE} alt="Les étapes pour saisir le code promo" loading="lazy" className="mt-3 w-full rounded-xl border border-outline" />
          <Link href={PROMO_GUIDE_PATH} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
            Ouvrir le guide en grand
          </Link>
        </details>
      </div>
    </section>
  );
}
