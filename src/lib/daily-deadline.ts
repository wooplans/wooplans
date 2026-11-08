/**
 * Échéance quotidienne du prix promo : chaque jour à 23h59m59 (heure de l'appareil du visiteur),
 * puis le compte à rebours repart pour le jour suivant. Module sans dépendance (testé par node --test).
 */

/** Millisecondes restantes avant 23h59m59,999 du jour de `now` (heure locale). Toujours > 0. */
export function msUntilDayEnd(now: Date): number {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime() + 1;
}

/** « 05:09:03 » : heures, minutes, secondes restantes. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
