/**
 * Calendrier de la séquence de relance des prospects du catalogue (paiement abandonné ou échoué).
 * Module sans dépendance pour pouvoir être testé isolément.
 */

export type ProspectSequenceSettings = {
  /** Envois automatiques actifs. */
  enabled: boolean;
  /** Délai de chaque email après le début de la séquence (heures), dans l'ordre. */
  delaysHours: number[];
  /** Code de réduction Chariow proposé à partir du 3e email (vide = pas d'offre). */
  discountCode: string;
  /** Libellé de la réduction, ex. « 10 000 FCFA de réduction ». */
  discountLabel: string;
  /** Plafond d'emails envoyés par passage (toutes les 15 min). */
  perRun: number;
};

export const DEFAULT_PROSPECT_SEQUENCE: ProspectSequenceSettings = {
  enabled: true,
  delaysHours: [1, 24, 72, 168],
  discountCode: "W10",
  discountLabel: "10 000 FCFA de réduction",
  perRun: 25,
};

/** Une séquence terminée depuis plus longtemps que ce délai peut reprendre si la personne réessaie de payer. */
export const SEQUENCE_RESTART_AFTER_DAYS = 30;

const HOUR = 3_600_000;

/** Date d'envoi de l'email numéro `step` (0 = premier) ; null quand la séquence est terminée. */
export function stepDueAt(startedAt: Date, step: number, delaysHours: number[]): Date | null {
  if (step < 0 || step >= delaysHours.length) return null;
  return new Date(startedAt.getTime() + Math.max(0, delaysHours[step]) * HOUR);
}

/**
 * Décide s'il faut (re)démarrer la séquence quand un nouvel abandon / échec arrive pour un prospect existant.
 * - jamais démarrée → oui ;
 * - en cours → non (pas de doublon d'emails) ;
 * - terminée depuis longtemps → oui, la personne réessaie.
 */
export function shouldStartSequence(
  prospect: { sequenceStartedAt: Date | null; nextEmailAt: Date | null; lastEmailAt: Date | null },
  now: Date,
) {
  if (!prospect.sequenceStartedAt) return true;
  if (prospect.nextEmailAt) return false;
  const last = prospect.lastEmailAt ?? prospect.sequenceStartedAt;
  return now.getTime() - last.getTime() > SEQUENCE_RESTART_AFTER_DAYS * 24 * HOUR;
}

/** Normalise les réglages saisis dans l'admin (délais croissants, bornés). */
export function sanitizeSequenceSettings(input: Partial<ProspectSequenceSettings>): ProspectSequenceSettings {
  const delays = (input.delaysHours ?? DEFAULT_PROSPECT_SEQUENCE.delaysHours)
    .map((h) => Math.round(Number(h)))
    .filter((h) => Number.isFinite(h) && h >= 0 && h <= 24 * 60)
    .slice(0, 6)
    .sort((a, b) => a - b);
  return {
    enabled: input.enabled ?? DEFAULT_PROSPECT_SEQUENCE.enabled,
    delaysHours: delays.length ? delays : DEFAULT_PROSPECT_SEQUENCE.delaysHours,
    discountCode: (input.discountCode ?? DEFAULT_PROSPECT_SEQUENCE.discountCode).trim().toUpperCase().slice(0, 40),
    discountLabel: (input.discountLabel ?? DEFAULT_PROSPECT_SEQUENCE.discountLabel).trim().slice(0, 80),
    perRun: Math.min(100, Math.max(1, Math.round(Number(input.perRun ?? DEFAULT_PROSPECT_SEQUENCE.perRun)) || 25)),
  };
}

/** Contenu de l'email n° `step` : aide au paiement, rappel de la valeur, offre, dernier rappel. */
export type ProspectEmailKind = "help" | "value" | "offer" | "last";

export function emailKindForStep(step: number, total: number, hasDiscount: boolean): ProspectEmailKind {
  if (step === 0) return "help";
  if (step === total - 1 && total > 2) return "last";
  if (step >= 2 && hasDiscount) return "offer";
  return "value";
}
