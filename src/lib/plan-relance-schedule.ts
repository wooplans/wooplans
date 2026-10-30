/**
 * Calendrier de la relance du plan et devis (paiement abandonné ou échoué) : séquence courte de 2 emails.
 * Module sans dépendance pour pouvoir être testé isolément.
 */

/** Délai de chaque email après l'abandon (heures), dans l'ordre. */
export const PLAN_RELANCE_DELAYS_HOURS = [1, 24];

/** Pas de nouvelle relance pour un email déjà relancé (sur n'importe quel modèle) pendant ce délai. */
export const PLAN_RELANCE_COOLDOWN_DAYS = 7;

const HOUR = 3_600_000;

/** Date du premier email après un abandon. */
export function firstRelanceAt(abandonedAt: Date, delaysHours = PLAN_RELANCE_DELAYS_HOURS): Date {
  return new Date(abandonedAt.getTime() + Math.max(0, delaysHours[0] ?? 1) * HOUR);
}

/**
 * Date de l'email suivant, après l'envoi de l'email `step` (0 = premier) prévu à `scheduledAt` ;
 * au moins 12 h après l'envoi réel (un envoi en retard ne déclenche pas le suivant aussitôt). null = terminé.
 */
export function nextRelanceAt(scheduledAt: Date, step: number, sentAt: Date, delaysHours = PLAN_RELANCE_DELAYS_HOURS): Date | null {
  if (step + 1 >= delaysHours.length) return null;
  const due = scheduledAt.getTime() + Math.max(0, delaysHours[step + 1] - delaysHours[step]) * HOUR;
  return new Date(Math.max(due, sentAt.getTime() + 12 * HOUR));
}
