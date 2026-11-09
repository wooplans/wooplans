"use client";

import { useEffect, useState } from "react";
import projet from "@/config/projet.json";
import { usePromoCode } from "@/components/promo-store";
import { projectAnchorPrice } from "@/lib/project-anchor";
import { upsellPrice } from "@/lib/upsell";
import { formatLocalAmount, formatLocalPrice, localPriceFor, type LocalPrice, type LocalPriceRule } from "@/lib/local-price";
import { OFFRE_PARAM, OFFRE_STORAGE_KEY, isRelanceCode, offreById, relanceDiscount, resolveOffre, type Offre } from "@/lib/offres";

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

const OFFRE_TTL_MS = 30 * 86_400_000;

/** Offre du lien de la pub (?offre=29k) : lue dans l'URL, sinon celle gardée 30 jours dans ce navigateur. */
function requestedOffre(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(OFFRE_PARAM);
    if (fromUrl && offreById(fromUrl)) {
      window.localStorage.setItem(OFFRE_STORAGE_KEY, JSON.stringify({ id: fromUrl.toLowerCase(), at: Date.now() }));
      return fromUrl;
    }
    const saved = JSON.parse(window.localStorage.getItem(OFFRE_STORAGE_KEY) || "null") as { id?: string; at?: number } | null;
    if (saved?.id && saved.at && Date.now() - saved.at < OFFRE_TTL_MS) return saved.id;
  } catch {}
  return null;
}

/**
 * Offre « plan et devis + Catalogue Premium offert » du visiteur (src/lib/offres.ts), null si aucune n'est active.
 * Premier affichage (et rendu serveur) : l'offre par défaut, puis celle du lien de la pub ou du pays.
 */
export function useOffre(): Offre | null {
  const country = useVisitorCountry();
  const [requested, setRequested] = useState<string | null>(null);
  useEffect(() => setRequested(requestedOffre()), []);
  return resolveOffre(requested, country);
}

const REMISE_STORAGE_KEY = "wp_remise";

/** Code de réduction du dernier email de relance (?remise=…), gardé 30 jours dans ce navigateur. */
function requestedRemise(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("remise");
    if (fromUrl && isRelanceCode(fromUrl)) {
      window.localStorage.setItem(REMISE_STORAGE_KEY, JSON.stringify({ code: fromUrl.toUpperCase(), at: Date.now() }));
      return fromUrl.toUpperCase();
    }
    const saved = JSON.parse(window.localStorage.getItem(REMISE_STORAGE_KEY) || "null") as { code?: string; at?: number } | null;
    if (saved?.code && isRelanceCode(saved.code) && saved.at && Date.now() - saved.at < OFFRE_TTL_MS) return saved.code;
  } catch {}
  return null;
}

/** Réduction active sur les offres (lien du dernier email de relance), null sinon. */
export function useRemise(): { code: string; discount: number } | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => setCode(requestedRemise()), []);
  const r = relanceDiscount();
  return code && r ? r : null;
}

/** Prix d'une offre, au format des prix locaux (FCFA : Chariow convertit au paiement). */
export function offrePrice(offre: Offre, remise?: { discount: number } | null): LocalPrice {
  // Réduction du dernier email de relance : nouveau prix, ancien prix barré.
  if (remise) return { amount: Math.max(0, offre.price - remise.discount), currency: "FCFA", anchor: offre.price };
  return { amount: offre.price, currency: "FCFA", anchor: offre.anchor && offre.anchor > offre.price ? offre.anchor : null };
}

/** Prix du visiteur, tel qu'il le retrouvera au paiement Chariow (offre avec catalogue offert, sinon plan et devis seul). */
export function useLocalPrice(): LocalPrice {
  const offre = useOffre();
  const remise = useRemise();
  const local = planDevisPrice(useVisitorCountry());
  return offre ? offrePrice(offre, remise) : local;
}

/**
 * Prix affiché sur les fiches : avec le code de l'offre aux clients actif dans ce navigateur
 * (client qui a déjà acheté, ou lien ?promo=…), prix réduit et prix normal barré.
 */
function useShownPrice(): LocalPrice & { approx: boolean } {
  const local = useLocalPrice();
  const offre = useOffre();
  const promo = usePromoCode();
  // Code de l'offre aux clients (PROMO10) : produit plan et devis seul, sans effet sur les offres avec catalogue.
  if (!promo || offre) return { ...local, approx: false };
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
