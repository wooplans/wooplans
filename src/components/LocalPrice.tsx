"use client";

import { useEffect, useState } from "react";
import projet from "@/config/projet.json";
import { usePromoCode } from "@/components/promo-store";
import { projectAnchorPrice } from "@/lib/project-anchor";
import { upsellPrice } from "@/lib/upsell";
import { formatLocalAmount, formatLocalPrice, localPriceFor, type LocalPrice, type LocalPriceRule } from "@/lib/local-price";

/**
 * Prix local affiché sur le site : désactivé le 9 nov. (« showLocalPrices »: false dans projet.json).
 * Les pubs annoncent 14 900 FCFA ; afficher 15 350 FCFA ou 235 941 GNF sur la fiche faisait chuter le passage
 * au paiement (3,5 % des visiteurs des pubs le 7 nov., 0,9 % les 8-9 nov.). Le site affiche donc 14 900 FCFA
 * partout et Chariow convertit au paiement, comme le 7 nov. (6 ventes).
 */
const SHOW_LOCAL_PRICES = (projet as { showLocalPrices?: boolean }).showLocalPrices === true;
const RULES = (SHOW_LOCAL_PRICES ? ((projet as { localPrices?: LocalPriceRule[] }).localPrices ?? []) : []) as LocalPriceRule[];
const STORAGE_KEY = "wp_pays";

/** Pays du visiteur : lu une seule fois par page (/api/pays), gardé en mémoire locale pour éviter le saut de prix. */
let countryPromise: Promise<string | null> | null = null;

function storedCountry(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function fetchCountry(): Promise<string | null> {
  if (!countryPromise) {
    countryPromise = fetch("/api/pays", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ country?: string | null }>)
      .then((d) => {
        const country = d.country || null;
        try {
          if (country) window.localStorage.setItem(STORAGE_KEY, country);
        } catch {}
        return country;
      })
      .catch(() => null);
  }
  return countryPromise;
}

/** Pays du visiteur (code ISO), null tant qu'il n'est pas connu. */
export function useVisitorCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const cached = storedCountry();
    if (cached) setCountry(cached);
    fetchCountry().then((c) => {
      if (!cancelled && c) setCountry(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return country;
}

/** Prix du plan et devis pour un pays (prix de base en FCFA si le pays n'a pas de prix local). */
export function planDevisPrice(country: string | null | undefined): LocalPrice {
  return localPriceFor(country, { price: projet.price, anchor: projectAnchorPrice() }, RULES);
}

/** Prix du plan et devis du visiteur, tel qu'il le retrouvera au paiement Chariow. */
export function useLocalPrice(): LocalPrice {
  return planDevisPrice(useVisitorCountry());
}

/**
 * Prix affiché sur les fiches : avec le code de l'offre aux clients actif dans ce navigateur
 * (client qui a déjà acheté, ou lien ?promo=…), prix réduit et prix normal barré.
 */
function useShownPrice(): LocalPrice & { approx: boolean } {
  const local = useLocalPrice();
  const promo = usePromoCode();
  if (!promo) return { ...local, approx: false };
  const p = upsellPrice(local);
  return { amount: p.amount, currency: p.currency, anchor: local.amount, approx: p.approx };
}

/**
 * Prix local affiché sur les fiches (la page est en cache, partagée entre pays : le prix est lu dans le navigateur).
 * - « full » : « 15 350 FCFA » ; « amount » : « 15 350 » ; « currency » : « FCFA » ; « anchor » : prix barré sans devise.
 */
export function LocalPriceText({ part = "full" }: { part?: "full" | "amount" | "currency" | "anchor" }) {
  const p = useShownPrice();
  const approx = p.approx ? "≈ " : "";
  if (part === "amount") return <>{approx}{formatLocalAmount(p.amount)}</>;
  if (part === "currency") return <>{p.currency}</>;
  if (part === "anchor") return p.anchor ? <>{formatLocalAmount(p.anchor)}</> : null;
  return <>{approx}{formatLocalPrice(p.amount, p.currency)}</>;
}

/** Prix barré local (balise <s>), rien s'il n'y a pas de prix d'ancrage. */
export function LocalAnchor({ className }: { className?: string }) {
  const p = useShownPrice();
  if (!p.anchor) return null;
  const text = formatLocalAmount(p.anchor);
  return (
    <s className={className} aria-label={`Au lieu de ${text} ${p.currency}`}>
      {text}
    </s>
  );
}
