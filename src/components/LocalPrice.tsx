"use client";

import { useEffect, useState } from "react";
import projet from "@/config/projet.json";
import { projectAnchorPrice } from "@/lib/project-anchor";
import { formatLocalAmount, formatLocalPrice, localPriceFor, type LocalPrice, type LocalPriceRule } from "@/lib/local-price";

const RULES = ((projet as { localPrices?: LocalPriceRule[] }).localPrices ?? []) as LocalPriceRule[];
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
 * Prix local affiché sur les fiches (la page est en cache, partagée entre pays : le prix est lu dans le navigateur).
 * - « full » : « 15 350 FCFA » ; « amount » : « 15 350 » ; « currency » : « FCFA » ; « anchor » : prix barré sans devise.
 */
export function LocalPriceText({ part = "full" }: { part?: "full" | "amount" | "currency" | "anchor" }) {
  const p = useLocalPrice();
  if (part === "amount") return <>{formatLocalAmount(p.amount)}</>;
  if (part === "currency") return <>{p.currency}</>;
  if (part === "anchor") return p.anchor ? <>{formatLocalAmount(p.anchor)}</> : null;
  return <>{formatLocalPrice(p.amount, p.currency)}</>;
}

/** Prix barré local (balise <s>), rien s'il n'y a pas de prix d'ancrage. */
export function LocalAnchor({ className }: { className?: string }) {
  const p = useLocalPrice();
  if (!p.anchor) return null;
  const text = formatLocalAmount(p.anchor);
  return (
    <s className={className} aria-label={`Au lieu de ${text} ${p.currency}`}>
      {text}
    </s>
  );
}
