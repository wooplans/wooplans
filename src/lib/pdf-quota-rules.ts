/**
 * Règles du quota de fiches PDF. Module sans dépendance pour pouvoir être testé isolément.
 *
 * Le quota porte sur les modèles différents : re-télécharger une fiche déjà obtenue
 * (pour la réimprimer, l'envoyer à un proche) ne coûte rien pendant la fenêtre mensuelle.
 * Il freine l'aspiration du catalogue sans gêner l'usage normal (quelques modèles comparés).
 */

export type PdfQuotaLimits = {
  /** Modèles différents par 24 heures glissantes. */
  perDay: number;
  /** Modèles différents par 30 jours glissants. */
  perMonth: number;
  /** Téléchargements au total (re-téléchargements compris) par 24 heures : garde-fou anti-script. */
  maxPerDay: number;
};

export const DEFAULT_PDF_QUOTA: PdfQuotaLimits = { perDay: 3, perMonth: 10, maxPerDay: 15 };

export const DAY_MS = 86_400_000;
export const MONTH_MS = 30 * DAY_MS;

export type PdfDownloadRow = { planSlug: string; createdAt: Date };

export type PdfQuotaStatus = {
  allowed: boolean;
  /** Fiche déjà obtenue sur la fenêtre : le téléchargement ne décompte rien. */
  alreadyOwned: boolean;
  reason?: "day" | "month" | "burst";
  /** Modèles différents encore téléchargeables. */
  remainingDay: number;
  remainingMonth: number;
  /** Date à laquelle une place se libère (si bloqué). */
  retryAt?: Date;
  /** Modèles différents déjà téléchargés sur 30 jours. */
  ownedSlugs: string[];
};

/** Lit les limites depuis les variables d'environnement (valeurs invalides → défaut). */
export function quotaLimits(env: { PDF_QUOTA_DAY?: string; PDF_QUOTA_MONTH?: string; PDF_QUOTA_MAX_PER_DAY?: string }): PdfQuotaLimits {
  const read = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };
  return {
    perDay: read(env.PDF_QUOTA_DAY, DEFAULT_PDF_QUOTA.perDay),
    perMonth: read(env.PDF_QUOTA_MONTH, DEFAULT_PDF_QUOTA.perMonth),
    maxPerDay: read(env.PDF_QUOTA_MAX_PER_DAY, DEFAULT_PDF_QUOTA.maxPerDay),
  };
}

/** Premier téléchargement de chaque modèle sur la fenêtre (les suivants sont gratuits). */
function firstDownloads(rows: PdfDownloadRow[], since: number) {
  const first = new Map<string, number>();
  for (const row of rows) {
    const t = row.createdAt.getTime();
    if (t < since) continue;
    const prev = first.get(row.planSlug);
    if (prev === undefined || t < prev) first.set(row.planSlug, t);
  }
  return first;
}

/**
 * Évalue le quota avant de servir la fiche `slug`.
 * `rows` : téléchargements du membre sur (au moins) les 30 derniers jours.
 */
export function evaluatePdfQuota(rows: PdfDownloadRow[], slug: string | null, limits: PdfQuotaLimits, now = new Date()): PdfQuotaStatus {
  const t = now.getTime();
  const month = firstDownloads(rows, t - MONTH_MS);
  const dayStarts = [...month.values()].filter((v) => v >= t - DAY_MS).sort((a, b) => a - b);
  const monthStarts = [...month.values()].sort((a, b) => a - b);
  const recent = rows.filter((r) => r.createdAt.getTime() >= t - DAY_MS).map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
  const base = {
    remainingDay: Math.max(0, limits.perDay - dayStarts.length),
    remainingMonth: Math.max(0, limits.perMonth - monthStarts.length),
    ownedSlugs: [...month.keys()],
  };
  const alreadyOwned = slug !== null && month.has(slug);

  if (recent.length >= limits.maxPerDay) {
    return { ...base, allowed: false, alreadyOwned, reason: "burst", retryAt: new Date(recent[recent.length - limits.maxPerDay] + DAY_MS) };
  }
  if (alreadyOwned) return { ...base, allowed: true, alreadyOwned };
  if (monthStarts.length >= limits.perMonth) {
    return { ...base, allowed: false, alreadyOwned, reason: "month", retryAt: new Date(monthStarts[monthStarts.length - limits.perMonth] + MONTH_MS) };
  }
  if (dayStarts.length >= limits.perDay) {
    return { ...base, allowed: false, alreadyOwned, reason: "day", retryAt: new Date(dayStarts[dayStarts.length - limits.perDay] + DAY_MS) };
  }
  return { ...base, allowed: true, alreadyOwned };
}
