/**
 * Calendrier des 5 messages WhatsApp de la phase de conversion (décision de Tao, 22 nov. 2026), calé sur la date
 * d'achat de l'extrait ou du guide (J0) et sur la fin du prix réservé (minuit UTC de J7). Règles pures, testées dans
 * tests/relance-schedule.test.ts.
 *  1. J0 : livraison ;
 *  2. J1 : la vidéo (VSL) avec l'offre ;
 *  3. J4 : rappel de l'offre, de ce qu'elle contient et de sa date ;
 *  4. J7 au matin : dernier jour ;
 *  5. J7 vers 20 h : message court, sans lien ni image (« Répondez OUI »).
 */
export const RELANCE_STEP_COUNT = 5;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function dayStart(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Moment où le message `step` (0 à 4) devient à envoyer. step 5 = fin de la séquence (minuit de J7). */
export function relanceDueAt(boughtAt: Date, step: number): Date {
  const j0 = dayStart(boughtAt);
  switch (step) {
    case 0:
      return boughtAt;
    case 1:
      return new Date(boughtAt.getTime() + DAY);
    case 2:
      return new Date(j0 + 4 * DAY + 8 * HOUR);
    case 3:
      return new Date(j0 + 7 * DAY + 7 * HOUR);
    case 4:
      return new Date(j0 + 7 * DAY + 19 * HOUR);
    default:
      return new Date(j0 + 8 * DAY);
  }
}

/**
 * Les messages 3 à 5 parlent du prix réservé : on ne les envoie plus une fois la date passée
 * (la personne sort de la séquence et passe à l'accompagnement).
 */
export function offerMessagesOver(step: number, reservedUntil: Date | null, now = new Date()) {
  return step >= 2 && (!reservedUntil || reservedUntil.getTime() <= now.getTime());
}

/** « ce soir à minuit » si la date de fin est ce soir, sinon la date en clair (offre rouverte 24 h, envoi en retard). */
export function endsText(until: Date, label: string, now = new Date()) {
  const tonight = dayStart(now) + DAY;
  return until.getTime() === tonight ? "ce soir à minuit" : `le ${label}`;
}
