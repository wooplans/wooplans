import type { ConvMessage } from "./conversation-ai-rules";

/**
 * Suivi des dossiers « Démarre ton chantier » par l'IA (demande de Tao, 25 nov. 2026) : l'IA lit la conversation
 * WhatsApp de chaque fiche, place le prospect dans le protocole (accueil → terrain connu → proforma → engagé, ou en
 * attente, ou perdu), relève les infos du terrain, fixe la date de relance (celle que le prospect a donnée, sinon le
 * rythme du protocole) et choisit le modèle de message à envoyer. Règles pures, testées dans
 * tests/chantier-ai.test.ts ; l'appel à DeepSeek et l'écriture en base sont dans src/lib/chantier-ai.ts.
 */

export const CHANTIER_STEPS = ["accueil", "terrain", "proforma", "attente", "engage", "perdu"] as const;
export type ChantierStep = (typeof CHANTIER_STEPS)[number];

export const STEP_LABEL: Record<ChantierStep, string> = {
  accueil: "1. Accueil : attend le dossier technique ou les dimensions",
  terrain: "2. Terrain connu : proforma à envoyer",
  proforma: "3. Proforma envoyée : attend l'avance",
  attente: "En attente : le prospect a demandé du temps",
  engage: "4. Engagé : avance payée",
  perdu: "Perdu",
};

export const LAND_PROOFS = ["aucun", "dimensions", "dossier"] as const;
export type LandProof = (typeof LAND_PROOFS)[number];

export type ChantierAiResult = {
  step: ChantierStep;
  land: LandProof;
  landDetails: string;
  relief: "plat" | "pente" | "inconnu";
  summary: string;
  nextAction: string;
  messageId: string | null;
  followUp: string | null;
  lostReason: string;
};

export const CHANTIER_AI_PROMPT = `Tu aides Tao, fondateur de WooPlans (Yaoundé, Cameroun), à suivre sur WhatsApp les prospects qui veulent des plans complets pour construire.
Offre : plans complets d'une villa 200 000 FCFA, d'un duplex 300 000 FCFA (remise possible jusqu'à 50 000 FCFA), immeuble à négocier avec Tao ; livrés en 7 jours ouvrables ; avance de 39 000 FCFA à la commande, déduite du prix, qui ouvre le Catalogue Premium et un groupe WhatsApp du projet. Paiement Orange Money.

Protocole de Tao :
- Un prospect sérieux a son terrain et veut démarrer au plus tôt ou dans 6 mois. Les autres (chantier dans 1 à 3 ans, pas de terrain) ne sont pas suivis à la main, sauf si la conversation montre que leur situation a changé.
- Il prouve son terrain avec le dossier technique du terrain (le mieux), à défaut avec la longueur, la largeur et le côté où passe la route.
- Un terrain en pente demande une visite de terrain payante.
- Ensuite Tao envoie une proforma ; le prospect paie l'avance ; il est alors engagé.

On te donne le dossier (réponses au formulaire), puis la conversation entre Tao (« WooPlans ») et le prospect (« Client »), et la liste des modèles de messages.
Réponds uniquement par un objet JSON :
{"step":"accueil|terrain|proforma|attente|engage|perdu","land":"aucun|dimensions|dossier","land_details":"...","relief":"plat|pente|inconnu","summary":"...","next_action":"...","message_id":"...","follow_up":"AAAA-MM-JJ ou null","lost_reason":"..."}
- step :
  accueil = on attend encore le dossier technique ou les dimensions ;
  terrain = le dossier ou les dimensions ont été donnés, la proforma n'est pas encore partie ;
  proforma = Tao a envoyé la proforma ou le prix des plans complets, l'avance n'est pas payée ;
  attente = le prospect a demandé du temps ou donné une date (« je vous envoie ça vendredi », « je suis en voyage ») ;
  engage = le prospect dit avoir payé l'avance, ou Tao confirme l'avoir reçue ;
  perdu = refuse, n'a pas de terrain en réalité, veut seulement une estimation sans plans, a déjà ses plans, n'a pas répondu à 3 relances de suite, ou n'est pas joignable.
- land : dossier si le dossier technique (ou plan de morcellement, titre avec dimensions) a été envoyé ou décrit ; dimensions si longueur et largeur sont connues ; aucun sinon (une surface seule en m² sans dimensions = aucun).
- land_details : ce qui est connu du terrain, court (ex. « 20 × 15 m, route côté 20 m, 300 m² »), vide sinon.
- relief : plat, pente, ou inconnu, d'après la conversation ou le dossier.
- summary : 1 ou 2 phrases en français : où en est la personne, son projet, ses objections.
- next_action : une action concrète pour Tao, 25 mots au plus.
- message_id : l'identifiant du modèle de message le plus utile à envoyer maintenant, choisi dans la liste ; null si aucun ne convient.
- follow_up : date de la prochaine relance. Si le prospect a donné une date ou un délai, utilise-la (« lundi » = le prochain lundi après la date du jour). Sinon : accueil = lendemain du dernier message de Tao resté sans réponse ; proforma = 1, puis 3, puis 7 jours après l'envoi ; terrain = aujourd'hui (proforma à envoyer) ; engage = 2 jours ; perdu = null.
- lost_reason : seulement si step = perdu (ex. « pas de terrain », « veut une estimation seulement »), vide sinon.
N'invente rien qui ne soit pas dans le dossier ou la conversation. Les notes vocales transcrites peuvent contenir des erreurs ou des bruits hors sujet : ignore ce qui ne concerne pas le projet.`;

function fmt(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function chantierConversation(messages: ConvMessage[], max = 60) {
  return messages
    .slice(-max)
    .map((m) => {
      const who = m.direction === "in" ? "Client" : "WooPlans";
      const content = m.transcript ? `[note vocale] ${m.transcript}` : m.body ? (m.type === "text" ? m.body : `[${m.type}] ${m.body}`) : `[${m.type}]`;
      return `${fmt(m.sentAt)} ${who} : ${content.replace(/\s+/g, " ").slice(0, 600)}`;
    })
    .join("\n");
}

export function chantierAiUserPrompt(dossier: string, messages: ConvMessage[], catalog: { id: string; title: string }[], now: Date) {
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  return [
    `Date du jour : ${now.toISOString().slice(0, 10)} (${days[now.getUTCDay()]}).`,
    `Dossier : ${dossier}`,
    `Modèles de messages : ${catalog.map((m) => `${m.id} (${m.title})`).join(" ; ")}`,
    `Conversation :\n${messages.length ? chantierConversation(messages) : "(aucun message)"}`,
  ].join("\n\n");
}

function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  const s = String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return (list as readonly string[]).includes(s) ? (s as T) : fallback;
}

/** Lit la réponse JSON de l'IA ; null si elle est inutilisable. La date de relance est bornée (aujourd'hui → +120 j). */
export function parseChantierAi(raw: string | null | undefined, messageIds: string[], now: Date): ChantierAiResult | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const stepRaw = String(d.step ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!(CHANTIER_STEPS as readonly string[]).includes(stepRaw)) return null;
  const step = stepRaw as ChantierStep;
  const today = now.toISOString().slice(0, 10);
  const max = new Date(now.getTime() + 120 * 86_400_000).toISOString().slice(0, 10);
  const f = String(d.follow_up ?? "");
  let followUp = /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(f)) ? f : null;
  if (followUp && followUp < today) followUp = today;
  if (followUp && followUp > max) followUp = max;
  if (step === "perdu") followUp = null;
  const id = String(d.message_id ?? "");
  const text = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  return {
    step,
    land: oneOf(LAND_PROOFS, d.land, "aucun"),
    landDetails: text(d.land_details, 160),
    relief: oneOf(["plat", "pente", "inconnu"] as const, d.relief, "inconnu"),
    summary: text(d.summary, 500),
    nextAction: text(d.next_action, 220),
    messageId: messageIds.includes(id) ? id : null,
    followUp,
    lostReason: step === "perdu" ? text(d.lost_reason, 160) : "",
  };
}

const ADVANCED = ["commande", "production", "livraison", "termine"];

/**
 * Étape CRM d'après l'étape du protocole. L'IA ne fait jamais reculer une fiche déjà en commande ou au-delà (Tao gère
 * la production et la livraison), et « en attente » garde l'étape actuelle.
 */
export function leadStageFor(step: ChantierStep, current: string): string {
  if (ADVANCED.includes(current)) return current;
  if (step === "attente") return current === "demande" ? "qualification" : current;
  return { accueil: "qualification", terrain: "qualification", proforma: "devis", engage: "commande", perdu: "perdu" }[step];
}

/**
 * Règle de Tao : les prospects tièdes (chantier dans 1 à 3 ans) et froids (pas de terrain) ne sont pas suivis à la
 * main. Tant que la conversation ne montre pas le contraire (l'IA les place alors en terrain, proforma, engagé ou
 * perdu), ils passent « en attente » : un seul message (tiède ou froid), puis relance dans 60 jours.
 */
export function applyProtocol(ai: ChantierAiResult, profile: string, now: Date): ChantierAiResult & { nurture: boolean } {
  const nurture = (profile === "bientot" || profile === "projet") && (ai.step === "accueil" || ai.step === "attente");
  if (!nurture) return { ...ai, nurture: false };
  return {
    ...ai,
    step: "attente",
    followUp: new Date(now.getTime() + 60 * 86_400_000).toISOString().slice(0, 10),
    messageId: profile === "bientot" ? "tiede" : "froid",
    nextAction: `Prospect ${profile === "bientot" ? "tiède (chantier dans 1 à 3 ans)" : "froid (pas encore de terrain)"} : un seul message avec le lien du catalogue, puis rien jusqu'à la relance dans 2 mois.`,
    nurture: true,
  };
}
