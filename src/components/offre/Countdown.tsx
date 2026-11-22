"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Compte à rebours réel jusqu'à la fin du prix réservé de la personne (sa date, pas un chrono qui recommence).
 * À zéro, la page se recharge : elle affiche alors le prix public.
 */
export function Countdown({ until, className = "" }: { until: string; className?: string }) {
  const end = Date.parse(until);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= end) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  // Rendu serveur : rien (l'heure exacte n'est connue que dans le navigateur).
  if (now === null) return <span className={className} aria-hidden />;
  const left = Math.max(0, Math.floor((end - now) / 1000));
  const days = Math.floor(left / 86400);
  const parts = [
    ...(days > 0 ? [[days, days > 1 ? "jours" : "jour"] as const] : []),
    [Math.floor((left % 86400) / 3600), "h"] as const,
    [Math.floor((left % 3600) / 60), "min"] as const,
    [left % 60, "s"] as const,
  ];
  return (
    <span className={`inline-flex gap-1.5 font-bold tabular-nums ${className}`} role="timer" aria-live="off">
      {parts.map(([value, unit]) => (
        <span key={unit} className="rounded-md bg-black/25 px-2 py-1">
          {unit === "jours" || unit === "jour" ? value : pad(value)}
          <span className="ml-0.5 text-[0.75em] font-semibold opacity-80">{unit}</span>
        </span>
      ))}
    </span>
  );
}
