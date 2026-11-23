/**
 * Formulaire de qualification des plans complets (décision de Tao, 23 nov. 2026) : la pub affiche le plan
 * complet et son prix, la personne répond à quelques questions, confirme, puis le bouton final l'envoie sur
 * WhatsApp avec un message pré-rempli. Chaque demande reçoit une note sur 100 (fiche CRM et alerte à Tao).
 * Règles pures, sans dépendance, testées (tests/plan-request.test.ts).
 */

export const PLAN_REQUEST_QUESTIONS = [
  {
    key: "type",
    label: "Quel type de maison voulez-vous construire ?",
    options: [
      ["villa", "Villa (plain-pied)"],
      ["duplex", "Duplex (R+1)"],
    ],
  },
  {
    key: "terrain",
    label: "Avez-vous déjà votre terrain ?",
    options: [
      ["titre", "Oui, avec titre foncier"],
      ["sans_titre", "Oui, titre en cours ou sans titre"],
      ["cherche", "Je suis en train de l'acheter"],
      ["non", "Pas encore"],
    ],
  },
  {
    key: "start",
    label: "Quand voulez-vous démarrer le chantier ?",
    options: [
      ["3m", "Dans les 3 prochains mois"],
      ["6m", "Dans 3 à 6 mois"],
      ["12m", "Dans 6 à 12 mois"],
      ["plus", "Plus tard / je ne sais pas"],
    ],
  },
  {
    key: "budget",
    label: "Votre budget de construction (hors plans) ?",
    options: [
      ["lt15", "Moins de 15 millions FCFA"],
      ["15_30", "15 à 30 millions"],
      ["30_50", "30 à 50 millions"],
      ["gt50", "Plus de 50 millions"],
    ],
  },
  {
    key: "ready",
    label: "Quand pouvez-vous lancer l'étape 1 (Catalogue Premium, inclus dans le prix) ?",
    options: [
      ["now", "Tout de suite"],
      ["month", "Dans le mois"],
      ["later", "Pas encore"],
    ],
  },
] as const;

export type PlanRequestKey = (typeof PLAN_REQUEST_QUESTIONS)[number]["key"];
export type PlanRequestAnswers = Record<PlanRequestKey, string>;

export type PlanRequestTier = "chaud" | "tiede" | "froid";

/** Réponses valides uniquement (chaque question, une valeur de la liste), sinon null. */
export function parsePlanRequestAnswers(input: Record<string, unknown>): PlanRequestAnswers | null {
  const out: Partial<PlanRequestAnswers> = {};
  for (const q of PLAN_REQUEST_QUESTIONS) {
    const v = String(input[q.key] ?? "");
    if (!q.options.some(([value]) => value === v)) return null;
    out[q.key] = v;
  }
  return out as PlanRequestAnswers;
}

/**
 * Note sur 100 : terrain (35), date de démarrage (35), budget cohérent avec le type (20), étape 1 (10).
 * Un duplex à moins de 15 millions n'est pas réaliste : 0 point de budget.
 */
export function planRequestScore(a: PlanRequestAnswers): number {
  const terrain = { titre: 35, sans_titre: 25, cherche: 10, non: 0 }[a.terrain] ?? 0;
  const start = { "3m": 35, "6m": 25, "12m": 10, plus: 0 }[a.start] ?? 0;
  const budgetPoints =
    a.type === "duplex" ? { lt15: 0, "15_30": 10, "30_50": 20, gt50: 20 } : { lt15: 10, "15_30": 20, "30_50": 20, gt50: 20 };
  const budget = budgetPoints[a.budget as keyof typeof budgetPoints] ?? 0;
  const ready = { now: 10, month: 5, later: 0 }[a.ready] ?? 0;
  return terrain + start + budget + ready;
}

/** Chaud : à rappeler dans l'heure (70 et plus). Tiède : 40 à 69. Froid : moins de 40. */
export function planRequestTier(score: number): PlanRequestTier {
  if (score >= 70) return "chaud";
  if (score >= 40) return "tiede";
  return "froid";
}

export const TIER_LABELS: Record<PlanRequestTier, string> = { chaud: "Chaud", tiede: "Tiède", froid: "Froid" };

function optionLabel(key: PlanRequestKey, value: string) {
  const q = PLAN_REQUEST_QUESTIONS.find((x) => x.key === key)!;
  return (q.options as readonly (readonly [string, string])[]).find(([v]) => v === value)?.[1] ?? "—";
}

/** Résumé lisible pour la fiche CRM et l'alerte : « Type : Duplex (R+1) · Terrain : … ». */
export function planRequestSummary(a: PlanRequestAnswers): string {
  const names: Record<PlanRequestKey, string> = { type: "Type", terrain: "Terrain", start: "Démarrage", budget: "Budget", ready: "Étape 1" };
  return PLAN_REQUEST_QUESTIONS.map((q) => `${names[q.key]} : ${optionLabel(q.key, a[q.key])}`).join(" · ");
}

/** Référence courte donnée au client et reprise dans le message WhatsApp (« WP-7K2Q »). */
export function planRequestRef(leadId: string): string {
  return `WP-${leadId.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * Message pré-rempli que le client envoie à WooPlans sur WhatsApp. Il ne contient ni la note ni le palier
 * (internes) : seulement la référence, le prénom, le modèle, la ville et les réponses.
 */
export function planRequestWhatsappText(p: {
  ref: string;
  name: string;
  answers: PlanRequestAnswers;
  plan?: string | null;
  city?: string | null;
}): string {
  const first = p.name.trim().split(/\s+/)[0] || "";
  const lines = [
    `Bonjour WooPlans 👋 Je suis ${first}. Je souhaite échanger avec un architecte pour mes plans complets (demande ${p.ref}).`,
    `• Type : ${optionLabel("type", p.answers.type)}${p.plan ? `, modèle ${p.plan}` : ""}`,
    `• Terrain : ${optionLabel("terrain", p.answers.terrain)}${p.city ? ` (${p.city})` : ""}`,
    `• Démarrage : ${optionLabel("start", p.answers.start)}`,
    `• Budget : ${optionLabel("budget", p.answers.budget)}`,
  ];
  return lines.join("\n");
}
