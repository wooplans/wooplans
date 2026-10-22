/**
 * Envoi automatique des codes d'accès aux anciens abonnés du Catalogue Premium (calendrier et choix
 * des destinataires). Module sans dépendance pour pouvoir être testé isolément.
 *
 * Chaque jour, dans une fenêtre du matin (heure de Douala, UTC+1 toute l'année), on envoie jusqu'à
 * `perDay` codes, sans jamais dépasser ce que le quota Resend laisse aux emails automatiques. Les
 * passages toutes les 15 min complètent le lot au fil de la fenêtre, à mesure que les envois de la
 * veille sortent des 24 h glissantes. Un membre sort de la file dès qu'il s'est connecté.
 */

export type LegacyCodesSettings = {
  /** Envoi automatique actif. */
  enabled: boolean;
  /** Heure de début de la fenêtre d'envoi (heure de Douala, 0-23). */
  hour: number;
  /** Durée de la fenêtre (heures) : les passages suivants complètent le lot du jour. */
  windowHours: number;
  /** Plafond de codes envoyés par jour (premiers envois + rappels). */
  perDay: number;
  /** Rappel (nouveau code) si le membre ne s'est pas connecté après ce délai ; 0 = pas de rappel. */
  reminderAfterDays: number;
};

export const DEFAULT_LEGACY_CODES: LegacyCodesSettings = { enabled: true, hour: 8, windowHours: 3, perDay: 60, reminderAfterDays: 5 };

/** Emails laissés libres pendant la fenêtre pour les relances prospects de la journée. */
export const PROSPECT_MARGIN = 10;
/** Plafond par passage (le Worker envoie un email toutes les 400 ms). */
export const MAX_PER_RUN = 30;
/** Au-delà de ce nombre d'échecs d'envoi (adresse invalide…), le membre n'est plus retenté. */
export const MAX_FAILURES = 2;

export const LEGACY_FIRST_TEMPLATE = "legacy_welcome";
export const LEGACY_REMINDER_TEMPLATE = "legacy_reminder";

const DOUALA_OFFSET_MS = 3_600_000;
const DAY = 86_400_000;

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v ?? fallback));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeLegacyCodesSettings(s: Partial<LegacyCodesSettings> | null | undefined): LegacyCodesSettings {
  const d = DEFAULT_LEGACY_CODES;
  return {
    enabled: s?.enabled ?? d.enabled,
    hour: clamp(s?.hour, 0, 23, d.hour),
    windowHours: clamp(s?.windowHours, 1, 12, d.windowHours),
    perDay: clamp(s?.perDay, 1, 100, d.perDay),
    reminderAfterDays: clamp(s?.reminderAfterDays, 0, 60, d.reminderAfterDays),
  };
}

/** Début (UTC) de la journée de Douala qui contient `now`. */
export function doualaDayStart(now: Date) {
  const local = now.getTime() + DOUALA_OFFSET_MS;
  return new Date(local - (local % DAY) - DOUALA_OFFSET_MS);
}

export function doualaHour(now: Date) {
  return new Date(now.getTime() + DOUALA_OFFSET_MS).getUTCHours();
}

export function inSendWindow(settings: LegacyCodesSettings, now: Date) {
  const h = doualaHour(now);
  return h >= settings.hour && h < settings.hour + settings.windowHours;
}

/** Prochain début de fenêtre (pour l'affichage dans l'admin). */
export function nextWindowStart(settings: LegacyCodesSettings, now: Date) {
  const today = new Date(doualaDayStart(now).getTime() + settings.hour * 3_600_000);
  if (now < new Date(today.getTime() + settings.windowHours * 3_600_000)) return today;
  return new Date(today.getTime() + DAY);
}

/** Nombre de codes à envoyer lors de ce passage (0 hors fenêtre, quota atteint ou objectif du jour rempli). */
export function legacyBatchSize(p: { settings: LegacyCodesSettings; now: Date; sentToday: number; allowance: number }) {
  if (!p.settings.enabled || !inSendWindow(p.settings, p.now)) return 0;
  return Math.max(0, Math.min(MAX_PER_RUN, p.settings.perDay - p.sentToday, p.allowance - PROSPECT_MARGIN));
}

export type LegacyCandidate = { id: string; lastLoginAt: Date | null };
/** Historique des emails de code d'un membre. */
export type LegacyHistory = {
  /** Date du dernier code reçu (tous types d'emails de code confondus), null si jamais reçu. */
  codeSentAt: Date | null;
  /** Un rappel a déjà été envoyé. */
  reminded: boolean;
  /** Échecs d'envoi des emails de cette file. */
  failures: number;
};

/**
 * File d'attente : d'abord ceux qui n'ont jamais reçu de code (les plus anciens membres d'abord,
 * dans l'ordre donné), puis les rappels pour ceux qui ont reçu leur code sans jamais se connecter.
 */
export function legacyQueue<T extends LegacyCandidate>(
  members: T[],
  history: Map<string, LegacyHistory>,
  settings: LegacyCodesSettings,
  now: Date,
) {
  const first: T[] = [];
  const reminders: T[] = [];
  for (const m of members) {
    if (m.lastLoginAt) continue;
    const h = history.get(m.id) ?? { codeSentAt: null, reminded: false, failures: 0 };
    if (h.failures >= MAX_FAILURES) continue;
    if (!h.codeSentAt) first.push(m);
    else if (settings.reminderAfterDays > 0 && !h.reminded && now.getTime() - h.codeSentAt.getTime() >= settings.reminderAfterDays * DAY)
      reminders.push(m);
  }
  return { first, reminders };
}
