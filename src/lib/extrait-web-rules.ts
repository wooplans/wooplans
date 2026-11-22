/**
 * Extrait en page web (23 nov. 2026) : règles pures, testées dans tests/extrait-web.test.ts.
 * Score d'intérêt d'un acheteur d'après ce qu'il fait sur son extrait en ligne :
 *  - a ouvert sa page : +5 (une seule fois), chaque retour un autre jour : +3 ;
 *  - chaque maison différente regardée : +2 (débloquée) ou +3 (verrouillée : il regarde ce qu'il n'a pas) ;
 *  - chaque clic sur un contenu verrouillé (plan, devis, fiche PDF) : +5, au plus 4 comptés ;
 *  - clic vers l'offre du catalogue : +10 ;
 *  - fiche PDF téléchargée : +2.
 * Plafonné à 100. Le niveau sert à trier les relances : « chaud » à partir de 40, « tiède » à partir de 15.
 */
export type ExtraitEventType = "open" | "view" | "locked" | "pdf" | "offer";
export type ExtraitEvent = { type: ExtraitEventType; planSlug: string | null; createdAt: Date };

export const PDF_PER_MODEL_LIMIT = 3;

export function extraitScore(events: ExtraitEvent[], unlocked: string[]) {
  const days = new Set(events.filter((e) => e.type === "open").map((e) => e.createdAt.toISOString().slice(0, 10)));
  const viewed = new Set(events.filter((e) => e.type === "view" && e.planSlug).map((e) => e.planSlug!));
  const locked = events.filter((e) => e.type === "locked").length;
  const offer = events.some((e) => e.type === "offer");
  const pdf = new Set(events.filter((e) => e.type === "pdf" && e.planSlug).map((e) => e.planSlug!)).size;
  let score = 0;
  if (days.size > 0) score += 5 + (days.size - 1) * 3;
  for (const slug of viewed) score += unlocked.includes(slug) ? 2 : 3;
  score += Math.min(locked, 4) * 5;
  if (offer) score += 10;
  score += pdf * 2;
  return {
    score: Math.min(score, 100),
    opens: days.size,
    viewed: viewed.size,
    lockedClicks: locked,
    offerClick: offer,
    pdfs: pdf,
  };
}

export function extraitLevel(score: number): "chaud" | "tiede" | "froid" {
  return score >= 40 ? "chaud" : score >= 15 ? "tiede" : "froid";
}

/** Montant masqué d'un devis verrouillé : même longueur visuelle, aucun chiffre réel envoyé au navigateur. */
export function maskedAmount(amount: number) {
  const digits = String(Math.max(Math.round(amount), 0)).length;
  return "█".repeat(Math.max(digits - 3, 1)) + " ███ FCFA";
}
