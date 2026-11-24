/**
 * Chaleur d'un lead pendant la phase de conversion (demande de Tao, 24 nov. 2026) : un seul chiffre de 0 à 100, calculé
 * en temps réel à partir de ce que la personne FAIT (pas des anciennes questions de la page de remerciement, retirées).
 * Règles pures, testées dans tests/lead-heat-rules.test.ts.
 */
export type HeatSignals = {
  /** Nous a écrit sur WhatsApp (au moins un message reçu). */
  wrote: boolean;
  /** Nombre de messages reçus. */
  inbound: number;
  /** A lu un de nos messages (accusé de lecture). */
  read: boolean;
  /** A cliqué un lien de nos relances. */
  clicked: boolean;
  /** Le plus loin qu'il est allé dans une vidéo : open, play, half, end, cta (null = pas ouverte). */
  video: string | null;
  /** Score d'intérêt sur l'extrait en ligne (0 à 100), null = pas ouvert. */
  extrait: number | null;
  /** A commencé à payer le Catalogue Premium (paiement lancé, échoué ou abandonné). */
  checkout: boolean;
  /** Note de l'IA sur la conversation (0 à 100), null = pas encore analysée. */
  ai: number | null;
  /** Dernière action connue (pour la fraîcheur). */
  lastActionAt: Date | null;
};

export type HeatLevel = "brulant" | "chaud" | "tiede" | "froid";

const VIDEO_POINTS: Record<string, number> = { open: 5, play: 10, half: 18, end: 25, cta: 30 };
const VIDEO_LABEL: Record<string, string> = { open: "a ouvert la vidéo", play: "a lancé la vidéo", half: "a vu la moitié de la vidéo", end: "a vu toute la vidéo", cta: "a cliqué l'offre sous la vidéo" };

export function leadHeat(s: HeatSignals, now = new Date()) {
  const reasons: string[] = [];
  let score = 0;
  if (s.checkout) {
    score += 40;
    reasons.push("a commencé à payer le catalogue");
  }
  if (s.video && VIDEO_POINTS[s.video]) {
    score += VIDEO_POINTS[s.video];
    reasons.push(VIDEO_LABEL[s.video]);
  }
  if (s.wrote) {
    score += Math.min(10 + 3 * Math.max(s.inbound - 1, 0), 20);
    reasons.push(s.inbound > 1 ? `nous a écrit ${s.inbound} messages` : "nous a écrit");
  }
  if (s.clicked) {
    score += 12;
    reasons.push("a cliqué un lien");
  }
  if (s.extrait !== null) {
    score += Math.round(Math.min(s.extrait, 100) * 0.15);
    reasons.push(s.extrait >= 40 ? "a bien exploré l'extrait en ligne" : "a ouvert l'extrait en ligne");
  }
  if (s.read && !s.clicked && !s.wrote) {
    score += 3;
    reasons.push("lit sans réagir");
  }
  if (s.ai !== null) score = Math.round(score * 0.75 + s.ai * 0.25);
  // Fraîcheur : une action dans les dernières 48 h compte plein, au-delà d'une semaine elle compte moitié.
  if (s.lastActionAt) {
    const days = (now.getTime() - s.lastActionAt.getTime()) / 86_400_000;
    if (days > 7) score = Math.round(score * 0.5);
    else if (days > 2) score = Math.round(score * 0.8);
  }
  score = Math.max(0, Math.min(score, 100));
  if (!reasons.length) reasons.push("aucune réaction pour l'instant");
  return { score, level: heatLevel(score), reasons };
}

export function heatLevel(score: number): HeatLevel {
  return score >= 60 ? "brulant" : score >= 35 ? "chaud" : score >= 12 ? "tiede" : "froid";
}

export const HEAT_LABEL: Record<HeatLevel, string> = { brulant: "🔥🔥 brûlant", chaud: "🔥 chaud", tiede: "tiède", froid: "froid" };

/**
 * Passage au catalogue mesuré à la fin de la 1re séquence (décision de Tao) : on ne compte que les personnes dont le prix
 * réservé est terminé ; converti = a acheté le catalogue au plus tard 24 h après la fin.
 */
export function cohortConversion(rows: { until: Date; convertedAt: Date | null }[], now = new Date()) {
  const ended = rows.filter((r) => r.until.getTime() <= now.getTime());
  const converted = ended.filter((r) => r.convertedAt && r.convertedAt.getTime() <= r.until.getTime() + 86_400_000).length;
  return { ended: ended.length, converted, rate: ended.length ? converted / ended.length : null };
}
