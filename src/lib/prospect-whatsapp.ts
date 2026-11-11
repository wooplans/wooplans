/**
 * Relances WhatsApp des paiements échoués ou abandonnés : le message est prêt dès l'évènement, à envoyer à la
 * main (lien wa.me) tant que la personne est « chaude ». Fonctions pures : aucune dépendance au site ni à la base.
 */

/** Au-delà, la personne n'est plus « chaude » : le message sort de la liste « WhatsApp à envoyer ». */
export const HOT_WINDOW_HOURS = 48;

export type ProspectLastEvent = "abandoned" | "failed" | "started" | "gift";

/** Offre tentée sur une fiche modèle (plan et devis + Catalogue Premium offert). */
export type TriedOffer = { name: string; priceLabel: string; resume: string };

export type WhatsappCandidate = {
  status: string;
  phone: string | null;
  lastEvent: ProspectLastEvent;
  lastEventAt: Date;
  whatsappSentAt: Date | null;
};

/** Un message est à envoyer : prospect ouvert avec un numéro, paiement échoué ou abandonné récent, pas encore relancé depuis. */
export function needsWhatsapp(p: WhatsappCandidate, now: Date = new Date()): boolean {
  if (p.status !== "open" || !p.phone) return false;
  if (p.lastEvent !== "failed" && p.lastEvent !== "abandoned") return false;
  if (p.lastEventAt.getTime() < now.getTime() - HOT_WINDOW_HOURS * 3600_000) return false;
  return !p.whatsappSentAt || p.whatsappSentAt.getTime() < p.lastEventAt.getTime();
}

/** Message de relance adapté à l'évènement et à l'offre tentée (texte envoyé tel quel après relecture). */
export function whatsappRelanceMessage(input: { firstName: string; lastEvent: ProspectLastEvent; tried?: TriedOffer | null; modelCode?: string | null }): string {
  const hello = `Bonjour${input.firstName ? ` ${input.firstName}` : ""}, ici WOOPLANS.`;
  const { tried } = input;
  if (tried) {
    return input.lastEvent === "failed"
      ? `${hello} Votre paiement du plan et devis de la ${tried.name} n'a pas abouti. Souvent c'est le solde ou la validation Mobile Money qui bloque : je peux vous aider à le finaliser. Pour réessayer : ${tried.resume}\n\nAvec votre plan et devis, le Catalogue Premium vous est offert : tous nos autres modèles pour comparer avant de choisir.`
      : `${hello} Vous avez commencé à commander le plan et devis de la ${tried.name} (${tried.priceLabel}, avec le Catalogue Premium offert). Avez-vous une question avant de finaliser ? Je suis là pour vous aider.\n\nPour reprendre : ${tried.resume}`;
  }
  if (input.lastEvent === "failed") return `${hello} Votre paiement du Catalogue Premium n'a pas abouti : puis-je vous aider à le finaliser ?`;
  if (input.lastEvent === "gift") {
    return `${hello} Avez-vous bien reçu le plan et devis${input.modelCode ? ` du modèle ${input.modelCode}` : ""} ? Avez-vous des questions sur ce modèle ?`;
  }
  return `${hello} Vous avez commencé à commander le Catalogue Premium : avez-vous rencontré un souci ? Je peux vous aider.`;
}

/** « il y a 12 min », « il y a 3 h », « il y a 2 j » : pour juger d'un coup d'œil si la personne est encore chaude. */
export function ageLabel(from: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}
