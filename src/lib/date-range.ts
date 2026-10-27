/**
 * Périodes du tableau de bord, en heure du Cameroun (UTC+1, sans heure d'été) : une journée
 * va de 00:00 à 24:00 heure de Douala. Module pur (testé sous Node).
 */

export const TZ_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;
export const PERIODS = [7, 30, 90, 365] as const;

/** Période analysée : [since, until[, en jours ; `day` (AAAA-MM-JJ) quand un seul jour est demandé. */
export type Range = { since: Date; until: Date; days: number; day?: string };

/** Jour calendaire (AAAA-MM-JJ, heure du Cameroun) d'un instant. */
export function localDay(d: Date) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Début (00:00 heure du Cameroun) d'un jour AAAA-MM-JJ. */
export function dayStart(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - TZ_OFFSET_MS);
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Les `days` derniers jours, aujourd'hui compris. */
export function periodRange(days: number, now = new Date()): Range {
  const tomorrow = dayStart(localDay(now)).getTime() + DAY_MS;
  return { since: new Date(tomorrow - days * DAY_MS), until: new Date(tomorrow), days };
}

/** Une seule journée. */
export function dayRange(day: string): Range {
  const since = dayStart(day);
  return { since, until: new Date(since.getTime() + DAY_MS), days: 1, day };
}

/** ?jour=AAAA-MM-JJ (un jour précis) ou ?jours=7|30|90|365 (défaut 30). */
export function parseRange(params: { jour?: string; jours?: string | number }, now = new Date()): Range {
  if (isDay(params.jour)) return dayRange(params.jour);
  const days = Number(params.jours);
  return periodRange((PERIODS as readonly number[]).includes(days) ? days : 30, now);
}

/** Jour voisin (AAAA-MM-JJ), pour naviguer d'un jour à l'autre. */
export function shiftDay(day: string, delta: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}
