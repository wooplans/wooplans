"use client";

import { useEffect, useState } from "react";
import { BUYER_STORAGE_KEY, PROMO_STORAGE_KEY, UPSELL, isUpsellCode } from "@/lib/upsell";

/**
 * Code de l'offre aux clients mémorisé dans le navigateur : posé par la page /merci après un achat
 * ou par un lien ?promo=… (email, WhatsApp). Tant qu'il est là, les prix du plan et devis sont
 * affichés avec la réduction et le code est rempli dans le formulaire. Gardé 30 jours
 * (le code reste valable chez Chariow au-delà).
 */
const PROMO_TTL_MS = 30 * 24 * 3600_000;

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

