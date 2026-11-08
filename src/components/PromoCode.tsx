"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocalPrice } from "@/components/LocalPrice";
import { formatLocalPrice } from "@/lib/local-price";
import { BUYER_STORAGE_KEY, PROMO_GUIDE_PATH, PROMO_STORAGE_KEY, UPSELL, isUpsellCode, upsellPrice } from "@/lib/upsell";

/** Code gardé 7 jours dans le navigateur (il reste valable chez Chariow au-delà). */
const PROMO_TTL_MS = 7 * 24 * 3600_000;

export type Buyer = { name?: string; email?: string; phone?: string; countryCode?: string };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Mémorise le code de l'offre (lien ?promo=… d'un email, d'un message WhatsApp ou de la page /merci). */
export function rememberPromo(code: string) {
  if (isUpsellCode(code)) writeJson(PROMO_STORAGE_KEY, { code: UPSELL.code, at: Date.now() });
}

function storedPromo(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("promo");
  if (fromUrl && isUpsellCode(fromUrl)) {
    rememberPromo(fromUrl);
    return UPSELL.code;
  }
  const saved = readJson<{ code?: string; at?: number }>(PROMO_STORAGE_KEY);
  return saved?.code && isUpsellCode(saved.code) && Date.now() - (saved.at ?? 0) < PROMO_TTL_MS ? UPSELL.code : null;
}

/** Code de l'offre actif dans ce navigateur (null sinon). */
export function usePromoCode(): string | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => setCode(storedPromo()), []);
  return code;
}

export function rememberBuyer(buyer: Buyer) {
  writeJson(BUYER_STORAGE_KEY, buyer);
}

export function storedBuyer(): Buyer | null {
  return readJson<Buyer>(BUYER_STORAGE_KEY);
}

/** Bandeau en haut du site quand le code est actif : le client sait qu'il sera rempli au paiement. */
export function PromoBanner() {
  const code = usePromoCode();
  const pathname = usePathname();
  const local = useLocalPrice();
  if (!code || pathname === "/merci" || pathname === "/code-promo") return null;
  const price = upsellPrice(local);
  return (
    <div className="bg-secondary px-4 py-2 text-center text-sm font-semibold text-white">
      🎁 Code <span className="font-mono tracking-wider">{code}</span> actif : chaque plan et devis à {price.approx ? "environ " : ""}
      {formatLocalPrice(price.amount, price.currency)} au lieu de {formatLocalPrice(local.amount, local.currency)}. Il est déjà rempli dans le
      formulaire.{" "}
      <Link href={PROMO_GUIDE_PATH} className="underline">
        Comment faire ?
      </Link>
    </div>
  );
}
