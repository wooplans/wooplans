/**
 * Règles du quota de fiches PDF. Module sans dépendance pour pouvoir être testé isolément.
 *
 * Le quota porte sur les modèles différents : re-télécharger une fiche déjà obtenue
 * (pour la réimprimer, l'envoyer à un proche) ne coûte rien. Au-delà d'un total de modèles
 * différents sur toute la durée de l'abonnement, les téléchargements sont bloqués
 * définitivement (y compris les re-téléchargements) : le catalogue reste consultable en ligne.
 */

export type PdfQuotaLimits = {
  /** Modèles différents par 24 heures glissantes. */
  perDay: number;
  /** Modèles différents par 30 jours glissants. */
  perMonth: number;
  /** Téléchargements au total (re-téléchargements compris) par 24 heures : garde-fou anti-script. */
  maxPerDay: number;
  /** Modèles différents sur toute la durée : au-delà, blocage définitif. */
  lifetime: number;
};

export const DEFAULT_PDF_QUOTA: PdfQuotaLimits = { perDay: 3, perMonth: 10, maxPerDay: 15, lifetime: 20 };

export const DAY_MS = 86_400_000;
export const MONTH_MS = 30 * DAY_MS;

export type PdfDownloadRow = { planSlug: string; createdAt: Date };

export type PdfQuotaStatus = {
  allowed: boolean;
  /** Fiche déjà obtenue : le téléchargement ne décompte rien. */
  alreadyOwned: boolean;
  reason?: "day" | "month" | "burst" | "lifetime";
  /** Modèles différents encore téléchargeables. */
  remainingDay: number;
  remainingMonth: number;
  /** Date à laquelle une place se libère (si bloqué). */
  retryAt?: Date;
  /** Modèles différents déjà téléchargés (depuis toujours), du plus récent au plus ancien. */
  ownedSlugs: string[];
  /** Modèles différents encore téléchargeables avant le blocage définitif. */
  remainingLifetime: number;
};

/** Lit les limites depuis les variables d'environnement (valeurs invalides → défaut). */
export function quotaLimits(env: { PDF_QUOTA_DAY?: string; PDF_QUOTA_MONTH?: string; PDF_QUOTA_MAX_PER_DAY?: string; PDF_QUOTA_LIFETIME?: string }): PdfQuotaLimits {
  const read = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };
  return {
    perDay: read(env.PDF_QUOTA_DAY, DEFAULT_PDF_QUOTA.perDay),
    perMonth: read(env.PDF_QUOTA_MONTH, DEFAULT_PDF_QUOTA.perMonth),
    maxPerDay: read(env.PDF_QUOTA_MAX_PER_DAY, DEFAULT_PDF_QUOTA.maxPerDay),
    lifetime: read(env.PDF_QUOTA_LIFETIME, DEFAULT_PDF_QUOTA.lifetime),
  };
}

function lastDownload(rows: PdfDownloadRow[], slug: string) {
  let last = 0;
  for (const r of rows) if (r.planSlug === slug && r.createdAt.getTime() > last) last = r.createdAt.getTime();
  return last;
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
 * `rows` : tous les téléchargements du membre.
 */
export function evaluatePdfQuota(rows: PdfDownloadRow[], slug: string | null, limits: PdfQuotaLimits, now = new Date()): PdfQuotaStatus {
  const t = now.getTime();
  const ever = firstDownloads(rows, -Infinity);
  // Fenêtre mensuelle : modèles obtenus pour la première fois il y a moins de 30 jours.
  const month = new Map([...ever].filter(([, v]) => v >= t - MONTH_MS));
  const dayStarts = [...month.values()].filter((v) => v >= t - DAY_MS).sort((a, b) => a - b);
  const monthStarts = [...month.values()].sort((a, b) => a - b);
  const recent = rows.filter((r) => r.createdAt.getTime() >= t - DAY_MS).map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
  const base = {
    remainingDay: Math.max(0, limits.perDay - dayStarts.length),
    remainingMonth: Math.max(0, limits.perMonth - monthStarts.length),
    remainingLifetime: Math.max(0, limits.lifetime - ever.size),
    ownedSlugs: [...ever.keys()].sort((a, b) => lastDownload(rows, b) - lastDownload(rows, a)),
  };
  const alreadyOwned = slug !== null && ever.has(slug);

  // Plafond atteint : plus aucun téléchargement, même d'une fiche déjà obtenue.
  if (ever.size >= limits.lifetime) return { ...base, allowed: false, alreadyOwned, reason: "lifetime" };

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
