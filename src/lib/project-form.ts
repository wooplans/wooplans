/**
 * Formulaire « Mon projet » (phase d'accompagnement, J10 puis J90) : 4 questions à choix, lien personnel
 * /mon-projet/<prospect>, aucune information personnelle demandée. Questions de Tao (20 nov.). Règles pures, testées.
 */
export const PROJECT_QUESTIONS = [
  { key: "terrain", label: "Avez-vous déjà votre terrain ?", options: [["oui", "Oui"], ["cherche", "Je cherche"], ["pas_encore", "Pas encore"]] },
  { key: "start", label: "Quand voulez-vous commencer à construire ?", options: [["6m", "Moins de 6 mois"], ["12m", "6 à 12 mois"], ["3a", "1 à 3 ans"], ["nsp", "Je ne sais pas encore"]] },
  { key: "budget", label: "Votre budget de construction ?", options: [["lt15", "Moins de 15 M"], ["15_30", "15 à 30 M"], ["30_50", "30 à 50 M"], ["gt50", "Plus de 50 M"]] },
  { key: "type", label: "Quel type de maison ?", options: [["villa", "Villa"], ["duplex", "Duplex"], ["nsp", "Je ne sais pas encore"]] },
] as const;

export type ProjectAnswers = { terrain: string; start: string; budget: string; type: string };

/** Réponses valides uniquement (chaque clé, une valeur de la liste), sinon null. */
export function parseProjectAnswers(input: Record<string, unknown>): ProjectAnswers | null {
  const out: Record<string, string> = {};
  for (const q of PROJECT_QUESTIONS) {
    const v = String(input[q.key] ?? "");
    if (!q.options.some(([value]) => value === v)) return null;
    out[q.key] = v;
  }
  return out as ProjectAnswers;
}

/** Points ajoutés à la note de chaleur : terrain (+15 / +5) et date de démarrage (+25 / +10). */
export function projectScore(a: ProjectAnswers) {
  const terrain = a.terrain === "oui" ? 15 : a.terrain === "cherche" ? 5 : 0;
  const start = a.start === "6m" ? 25 : a.start === "12m" ? 10 : 0;
  return terrain + start;
}

/** Terrain + démarrage dans les 6 mois : prospect brûlant (carte « Urgent »). */
export function isBurningProject(a: ProjectAnswers) {
  return a.terrain === "oui" && a.start === "6m";
}

/** Page du site où l'on envoie la personne après le formulaire (décision de Tao : pas de retour sur WhatsApp). */
export function projectRedirectPath(a: Pick<ProjectAnswers, "type">) {
  const path = a.type === "villa" ? "/catalogue-villa" : a.type === "duplex" ? "/catalogue-duplex" : "/catalogue";
  return `${path}?utm_source=formulaire&utm_medium=projet&utm_campaign=qualification`;
}

/** Résumé lisible pour la fiche CRM : « Terrain : Oui · Démarrage : Moins de 6 mois · … ». */
export function projectSummary(a: ProjectAnswers) {
  const names: Record<string, string> = { terrain: "Terrain", start: "Démarrage", budget: "Budget", type: "Type" };
  return PROJECT_QUESTIONS.map((q) => `${names[q.key]} : ${q.options.find(([v]) => v === a[q.key as keyof ProjectAnswers])?.[1] ?? "—"}`).join(" · ");
}
