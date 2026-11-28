/**
 * Qualification des prospects par l'IA (DeepSeek) d'après leur conversation WhatsApp (23 nov. 2026).
 * Règles pures (texte envoyé à l'IA, lecture de sa réponse), testées dans tests/conversation-ai.test.ts.
 */
export type ConvMessage = { direction: "in" | "out"; type: string; body: string | null; transcript: string | null; sentAt: Date };
export type AiStage = "chaud" | "tiede" | "froid" | "perdu";
export type Qualification = { stage: AiStage; score: number; summary: string; nextAction: string };

const STAGES: AiStage[] = ["chaud", "tiede", "froid", "perdu"];

export const SYSTEM_PROMPT = `Tu aides Tao, fondateur de WooPlans (plans de villas et duplex pour l'Afrique francophone), à suivre ses prospects sur WhatsApp.
Produit vendu : le Catalogue Premium (100 villas et duplex avec rendu 3D, plan coté et devis poste par poste). Prix actuel 29 000 FCFA (l'ancien prix 39 000 FCFA est barré sur la page de vente) ; les acheteurs de l'extrait ou du guide paient aussi 29 000 FCFA.
On te donne la conversation entre Tao (« WooPlans ») et un prospect (« Client »), avec le contexte de son achat.
Réponds uniquement par un objet JSON : {"stage":"chaud|tiede|froid|perdu","score":0-100,"summary":"...","next_action":"..."}
- stage : chaud = veut acheter ou pose des questions d'achat (paiement, prix, contenu) ; tiede = intéressé mais hésite ou pas maintenant ; froid = ne répond pas ou peu d'intérêt ; perdu = refuse clairement, n'a pas les moyens, ou demande d'arrêter.
- score : probabilité d'achat du catalogue, de 0 à 100.
- summary : 1 ou 2 phrases en français : où en est la personne, son projet (terrain, budget, délai, type de maison) s'il est connu, ses objections.
- next_action : une action concrète pour Tao, 25 mots au plus, en français (ex. « Lui renvoyer le lien de paiement et proposer de l'aider avec Wave »).
Le contexte peut aussi contenir son « Comportement » (ce qu'il a fait : vidéo regardée, liens cliqués, extrait en ligne, paiement commencé) : tiens-en compte. Quelqu'un qui a commencé à payer ou regardé toute la vidéo est chaud même s'il n'écrit pas ; quelqu'un qui lit sans jamais réagir est froid. S'il n'y a pas encore de conversation, juge sur le comportement seul.
N'invente rien qui ne soit pas dans la conversation ou le comportement.`;

function fmt(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

/** Texte de la conversation (les 40 derniers messages), du plus ancien au plus récent. */
export function conversationText(messages: ConvMessage[], max = 40) {
  return messages
    .slice(-max)
    .map((m) => {
      const who = m.direction === "in" ? "Client" : "WooPlans";
      const content = m.transcript ? `[note vocale] ${m.transcript}` : m.body ? (m.type === "text" ? m.body : `[${m.type}] ${m.body}`) : `[${m.type}]`;
      return `${fmt(m.sentAt)} ${who} : ${content.replace(/\s+/g, " ").slice(0, 600)}`;
    })
    .join("\n");
}

export function userPrompt(context: string, messages: ConvMessage[]) {
  return `Contexte : ${context}\n\nConversation :\n${messages.length ? conversationText(messages) : "(aucun message pour l'instant)"}`;
}

/** Lit la réponse JSON de l'IA ; null si elle est inutilisable. */
export function parseQualification(raw: string | null | undefined): Qualification | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const stage = STAGES.find((s) => s === String(data.stage || "").toLowerCase().replace("è", "e").replace("é", "e"));
  const score = Math.round(Number(data.score));
  if (!stage || !Number.isFinite(score)) return null;
  return {
    stage,
    score: Math.min(Math.max(score, 0), 100),
    summary: String(data.summary || "").trim().slice(0, 500),
    nextAction: String(data.next_action || data.nextAction || "").trim().slice(0, 200),
  };
}
