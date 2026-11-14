/**
 * « Guide WooPlans des maisons » (lead magnet payant, 1 900 FCFA) : règles sans dépendance, testables isolément.
 * Réglages : src/config/guide.json. Procédure : docs/guide-des-maisons.md.
 */

export type GuideConfig = {
  price: number;
  /** Produit Chariow du guide (vide = page de vente visible mais paiement inactif). */
  chariowProductId: string;
  announcedModels: number;
  /** Clé du PDF dans le bucket R2 MEDIA (privé, servi seulement à un acheteur). */
  pdfKey: string;
  pdfFileName: string;
  /** Vidéo de la page de vente (Tao fait défiler le guide sur son téléphone). */
  video: string;
  videoPoster: string;
  /** Vidéo de la page de remerciement (Tao feuillette le Catalogue Premium imprimé). */
  catalogueVideo: string;
  catalogueVideoPoster: string;
};

/** Identifiant de bouton (checkout_intents.cta_id) des achats du guide. */
export const GUIDE_CTA_ID = "guide";

/* ─────────────── Questions de qualification (page de remerciement) ─────────────── */

export const TERRAIN_OPTIONS = [
  { id: "titre", label: "Oui, avec titre foncier" },
  { id: "sans_titre", label: "Oui, titre en cours ou sans titre" },
  { id: "non", label: "Pas encore" },
] as const;

export const START_OPTIONS = [
  { id: "3mois", label: "Dans les 3 prochains mois" },
  { id: "6mois", label: "Dans 3 à 6 mois" },
  { id: "12mois", label: "Dans 6 à 12 mois" },
  { id: "plus", label: "Plus tard / je ne sais pas" },
] as const;

export const BUDGET_OPTIONS = [
  { id: "15", label: "Moins de 15 millions" },
  { id: "25", label: "De 15 à 25 millions" },
  { id: "40", label: "De 25 à 40 millions" },
  { id: "70", label: "De 40 à 70 millions" },
  { id: "plus", label: "Plus de 70 millions" },
] as const;

export const HEARD_FROM_OPTIONS = [
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "whatsapp", label: "WhatsApp (statut, groupe, contact)" },
  { id: "bouche", label: "Un proche m'en a parlé" },
  { id: "google", label: "Google" },
  { id: "autre", label: "Autre" },
] as const;

export type Qualification = { terrain: string; start: string; budget: string };

const label = (options: readonly { id: string; label: string }[], id: string | null | undefined) =>
  options.find((o) => o.id === id)?.label ?? null;

export const terrainLabel = (id?: string | null) => label(TERRAIN_OPTIONS, id);
export const startLabel = (id?: string | null) => label(START_OPTIONS, id);
export const budgetLabel = (id?: string | null) => label(BUDGET_OPTIONS, id);
export const heardFromLabel = (id?: string | null) => label(HEARD_FROM_OPTIONS, id);

/** Réponses valides uniquement (toute autre valeur est refusée). */
export function parseQualification(input: Partial<Record<keyof Qualification, unknown>>): Qualification | null {
  const terrain = String(input.terrain ?? "");
  const start = String(input.start ?? "");
  const budget = String(input.budget ?? "");
  if (!terrainLabel(terrain) || !startLabel(start) || !budgetLabel(budget)) return null;
  return { terrain, start, budget };
}

export function parseHeardFrom(input: unknown): string | null {
  const id = String(input ?? "");
  return heardFromLabel(id) ? id : null;
}

/**
 * Lead « chaud » : terrain (avec ou sans titre) et démarrage dans les 6 mois. Tao le contacte lui-même sur WhatsApp
 * (fiche CRM « demande » + alerte) ; les autres suivent la séquence d'emails du guide.
 */
export function isHotLead(q: Qualification) {
  return (q.terrain === "titre" || q.terrain === "sans_titre") && (q.start === "3mois" || q.start === "6mois");
}

export function qualificationSummary(q: Qualification) {
  return `Terrain : ${terrainLabel(q.terrain)}. Démarrage : ${startLabel(q.start)}. Budget : ${budgetLabel(q.budget)}.`;
}

/* ─────────────── Séquence d'emails après l'achat du guide ─────────────── */

/**
 * 7 emails sur 10 jours après l'email de livraison, jusqu'au Catalogue Premium (prix plein, aucune réduction,
 * aucune fausse urgence). Délais depuis l'achat (heures).
 */
export const GUIDE_DELAYS_HOURS = [24, 48, 96, 144, 192, 216, 240];

export type GuideEmailKind = "open" | "budget" | "villa_duplex" | "inside" | "faq" | "plans" | "last";

export function guideKindForStep(step: number): GuideEmailKind {
  const kinds = ["open", "budget", "villa_duplex", "inside", "faq", "plans", "last"] as const;
  return kinds[Math.min(Math.max(step, 0), kinds.length - 1)];
}
