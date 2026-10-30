/**
 * Séquence après l'achat du Catalogue Premium : demande d'avis en priorité, au plus 2 emails le premier mois,
 * puis des rappels espacés pour ménager le quota d'emails. Module sans dépendance pour pouvoir être testé isolément.
 */

/** Jours après l'achat : J+1 (demande d'avis, à chaud), J+17 (rappel), puis J+47 et J+107. */
export const AFTER_SALE_DAYS = [1, 17, 47, 107];

const DAY = 86_400_000;

/** Date de l'email numéro `step` (0 = premier) ; null quand la séquence est terminée. */
export function afterSaleDueAt(purchasedAt: Date, step: number, days = AFTER_SALE_DAYS): Date | null {
  if (step < 0 || step >= days.length) return null;
  return new Date(purchasedAt.getTime() + days[step] * DAY);
}

/** Prochain envoi après l'email `step`, au moins 10 jours après l'envoi réel (un envoi en retard ne rapproche pas le suivant). */
export function afterSaleNextAt(purchasedAt: Date, step: number, sentAt: Date, days = AFTER_SALE_DAYS): Date | null {
  const due = afterSaleDueAt(purchasedAt, step + 1, days);
  if (!due) return null;
  return new Date(Math.max(due.getTime(), sentAt.getTime() + 10 * DAY));
}
