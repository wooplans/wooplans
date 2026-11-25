/**
 * Onglet « Plans complets » : les relances du jour, une carte par prospect, classées par l'IA (décisions de Tao du
 * 25 nov. 2026). Règles pures, testées dans tests/chantier-relances.test.ts.
 *
 * Une carte apparaît quand le prospect a écrit et attend une réponse, ou quand sa date de relance est arrivée (sauf si
 * Tao lui a déjà écrit aujourd'hui). Ordre : a écrit, engagé, proforma, terrain connu, chaud, puis tièdes et froids ;
 * dans chaque groupe, les retards d'abord, puis duplex et immeuble avant villa, « au plus tôt » avant « 6 mois ».
 * Après un clic, la carte passe en grisé en bas de la pile ; elle disparaît dès que le message ou l'audio est parti, et
 * remonte au bout de 2 heures si rien n'est parti.
 */

export type RelanceRow = {
  id: string;
  code: string;
  name: string;
  profile: string;
  houseType: string;
  bedrooms: string;
  start: string;
  aiStep: string | null;
  aiFollowUp: string | null;
  aiMessageId: string | null;
  aiUpdatedAt: number | null;
  clickedAt: number | null;
  lastIn: number | null;
  lastOut: number | null;
  leadStage: string;
  /** Avis de l'IA sur le dernier message du prospect (1 attend une réponse, 0 politesse), et ce message. */
  aiAwaiting?: number | null;
  lastInText?: string | null;
};

export type RelanceGroup = "repondre" | "engage" | "proforma" | "terrain" | "chaud" | "attente";

export const GROUP_LABEL: Record<RelanceGroup, string> = {
  repondre: "A écrit, attend votre réponse",
  engage: "Engagé : suivi du projet",
  proforma: "Proforma envoyée : relancer pour l'avance",
  terrain: "Terrain connu : proforma à envoyer",
  chaud: "Chaud : attend le dossier ou les dimensions",
  attente: "Tiède ou froid : relance à 2 mois",
};

const ORDER: RelanceGroup[] = ["repondre", "engage", "proforma", "terrain", "chaud", "attente"];
const HOUR = 3_600_000;

/** Date du jour au Cameroun (UTC+1), AAAA-MM-JJ. */
export function cameroonDay(t: number) {
  return new Date(t + HOUR).toISOString().slice(0, 10);
}

/** Message qui ne fait que clore poliment : « ok », « merci », « d'accord », « bonne journée », 👍… */
export function isPoliteOnly(text: string | null | undefined) {
  if (!text) return false;
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true; // émoji ou ponctuation seule (👍, 🙏, …)
  if (t.length > 60) return false;
  const polite = /^(ok+|okay|d accord|dac|bien|tres bien|merci( beaucoup| bien| infiniment)?|merci (a|a vous|pareil( a vous)?|bcp)|pareil a vous|bonne (journee|soiree|nuit|fin de journee)|a bientot|recu|bien recu|parfait|super|cool|top|ca marche|entendu|note|oui merci|ok merci|merci ok|amen|merci et bonne journee)( (a vous|aussi|egalement|pareillement|merci|monsieur|madame|boss|chef|frere|grand frere))*$/;
  return polite.test(t);
}

export type RelanceCard = RelanceRow & { group: RelanceGroup; overdue: boolean; clicked: boolean; waiting: boolean };

export function relanceCards(rows: RelanceRow[], now: number): RelanceCard[] {
  const today = cameroonDay(now);
  const cards: RelanceCard[] = [];
  for (const r of rows) {
    const lastWord = Boolean(r.lastIn && (!r.lastOut || r.lastIn > r.lastOut));
    // Une simple politesse (« merci », « ok ») n'attend pas de réponse : avis de l'IA s'il est à jour, sinon la règle.
    const aiSaysPolite = r.aiAwaiting === 0 && Boolean(r.aiUpdatedAt && r.lastIn && r.aiUpdatedAt >= r.lastIn);
    const waiting = lastWord && !aiSaysPolite && !isPoliteOnly(r.lastInText);
    const contactedToday = Boolean(r.lastOut && cameroonDay(r.lastOut) === today && (!r.lastIn || r.lastOut > r.lastIn));
    const nurture = r.profile === "bientot" || r.profile === "projet" || r.profile === "a_ses_plans";
    const step = r.aiStep ?? (nurture ? "attente" : "accueil");
    const due = step === "terrain" || Boolean(r.aiFollowUp && r.aiFollowUp <= today);
    if (!waiting && (step === "perdu" || contactedToday || !due)) continue;
    if (["commande", "production", "livraison", "termine"].includes(r.leadStage) && step !== "engage" && !waiting) continue;
    const group: RelanceGroup = waiting
      ? "repondre"
      : step === "engage"
        ? "engage"
        : step === "proforma"
          ? "proforma"
          : step === "terrain"
            ? "terrain"
            : nurture && step === "attente"
              ? "attente"
              : "chaud";
    const clicked = Boolean(r.clickedAt && now - r.clickedAt < 2 * HOUR && (!r.lastOut || r.lastOut < r.clickedAt));
    cards.push({ ...r, group, overdue: Boolean(r.aiFollowUp && r.aiFollowUp < today), clicked, waiting });
  }
  const typeRank = (t: string) => (t === "duplex" || t === "immeuble" ? 0 : t === "villa" ? 1 : 2);
  const startRank = (s: string) => (s === "asap" ? 0 : s === "6mois" ? 1 : 2);
  return cards.sort(
    (a, b) =>
      Number(a.clicked) - Number(b.clicked) ||
      ORDER.indexOf(a.group) - ORDER.indexOf(b.group) ||
      (a.waiting && b.waiting ? (a.lastIn ?? 0) - (b.lastIn ?? 0) : 0) ||
      Number(b.overdue) - Number(a.overdue) ||
      (a.aiFollowUp ?? "").localeCompare(b.aiFollowUp ?? "") ||
      typeRank(a.houseType) - typeRank(b.houseType) ||
      startRank(a.start) - startRank(b.start) ||
      (a.lastIn ?? 0) - (b.lastIn ?? 0),
  );
}

/**
 * Message proposé sur la carte : celui de l'IA, s'il tient compte du dernier message du prospect ; sinon celui de
 * l'étape. Pour un prospect qui vient d'écrire et que l'IA n'a pas encore lu : null (Tao répond librement).
 */
export function suggestedMessageId(c: RelanceCard): string | null {
  const fresh = c.aiUpdatedAt && (!c.lastIn || c.aiUpdatedAt >= c.lastIn);
  if (c.aiMessageId && fresh) return c.aiMessageId;
  if (c.waiting) return c.lastOut ? null : c.profile === "bientot" ? "tiede" : c.profile === "projet" ? "froid" : c.profile === "a_ses_plans" ? "hors-cible" : "accueil";
  return (
    {
      engage: "groupe",
      proforma: "proforma-j1",
      terrain: "proforma",
      chaud: c.lastOut ? "accueil-relance" : "accueil",
      attente: c.profile === "bientot" ? "tiede" : "froid",
      repondre: null,
    }[c.group] ?? null
  );
}

/** « il y a 5 min », « il y a 3 h », « hier », « il y a 4 j ». */
export function ago(t: number, now: number) {
  const m = Math.max(0, Math.round((now - t) / 60_000));
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}
