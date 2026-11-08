"use client";

import { useEffect, useState } from "react";
import { formatCountdown, msUntilDayEnd } from "@/lib/daily-deadline";

/**
 * Compte à rebours du prix promo du jour : fin à 23h59, il repart chaque jour.
 * Rendu côté client seulement (la page est en cache, l'heure est celle du visiteur) ; l'espace est réservé
 * pour éviter tout saut de mise en page.
 */
export function PriceCountdown({ className = "" }: { className?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(msUntilDayEnd(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={`min-h-[1.5rem] text-sm font-semibold text-secondary ${className}`} role="timer" aria-live="off">
      {left === null ? null : (
        <>
          ⏳ Prix promo valable aujourd&apos;hui : fin à 23h59 · <span className="font-mono tabular-nums">{formatCountdown(left)}</span>
        </>
      )}
    </p>
  );
}
