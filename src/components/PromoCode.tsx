"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalPrice } from "@/components/LocalPrice";
import { usePromoCode } from "@/components/promo-store";
import { formatLocalPrice } from "@/lib/local-price";
import { PROMO_GUIDE_PATH, upsellPrice } from "@/lib/upsell";

export { rememberBuyer, rememberPromo, storedBuyer, usePromoCode, type Buyer } from "@/components/promo-store";

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
      {formatLocalPrice(price.amount, price.currency)} au lieu de {formatLocalPrice(local.amount, local.currency)}. Il est déjà appliqué.{" "}
      <Link href={PROMO_GUIDE_PATH} className="underline">
        Comment faire ?
      </Link>
    </div>
  );
}
