/**
 * Demande de témoignage par WhatsApp : le client ouvre la page /temoignage, écoute le message de WOOPLANS,
 * puis envoie une courte vidéo ou un vocal WhatsApp en suivant 4 points. Messages préremplis envoyés depuis l'admin.
 * Module sans dépendance pour pouvoir être testé isolément.
 */

/** Délai avant de proposer une relance à un membre déjà sollicité. */
export const TESTIMONIAL_RELAUNCH_DAYS = 4;

/**
 * Structure de l'avis : pensée pour lever les doutes de l'acheteur qui hésite à payer en ligne
 * (paiement réel, code d'accès reçu, qualité des plans, recommandation).
 */
export const TESTIMONIAL_QUESTIONS = [
  "Présentez-vous : votre prénom, votre ville et votre pays.",
  "Dites quel plan vous avez choisi, et confirmez que vous avez payé en ligne et bien reçu votre plan et votre accès au Catalogue Premium.",
  "Dites ce que vous pensez du plan, du devis et des autres modèles du catalogue.",
  "Le recommanderiez-vous à quelqu'un qui hésite encore ? Pourquoi ?",
];

/** Texte prérempli quand le client ouvre WhatsApp depuis la page, juste avant d'envoyer sa vidéo ou son vocal. */
export const TESTIMONIAL_WHATSAPP_TEXT = "Bonjour WOOPLANS 👋 Voici mon témoignage 🎥🎙️";

/** Prénom pour un message personnel (« M. Francis Bilong » → « Francis »). */
export function firstName(name: string | null | undefined) {
  const words = (name || "").trim().split(/\s+/).filter((w) => !/^(m|mr|mme|mlle|dr|me)\.?$/i.test(w));
  const word = words[0] || "";
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "";
}

/** Message WhatsApp envoyé au client depuis le téléphone de WOOPLANS (planCode : modèle acheté sur sa fiche). */
export function testimonialRequestMessage(params: { name?: string | null; link: string; relaunch?: boolean; planCode?: string | null }) {
  const prenom = firstName(params.name);
  const hello = prenom ? `Bonjour ${prenom} 👋` : "Bonjour 👋";
  if (params.relaunch) {
    return [
      `${hello}, petit rappel de WOOPLANS 🙂`,
      `Auriez-vous 2 minutes pour nous envoyer votre témoignage ? Une courte vidéo filmée avec votre téléphone, ou un simple vocal, suffit. Tout est expliqué ici :`,
      params.link,
      `Merci d'avance 🙏`,
    ].join("\n\n");
  }
  const bought = params.planCode ? `le plan et devis du modèle ${params.planCode}` : "WOOPLANS";
  return [
    `${hello}, c'est WOOPLANS. Merci encore d'avoir choisi ${bought} 🙏`,
    `Pourriez-vous nous accorder 2 petites minutes pour un témoignage ? Une courte vidéo (30 secondes à 1 minute, face caméra) ou un simple vocal WhatsApp, comme vous préférez. Tout est expliqué ici :`,
    params.link,
    `Merci beaucoup, ça aide énormément les familles qui hésitent encore !`,
  ].join("\n\n");
}

/** Message à publier en statut WhatsApp ou dans une liste de diffusion. */
export function testimonialBroadcastMessage(link: string) {
  return [
    `Vous avez acheté un plan et devis WOOPLANS ? 🏡`,
    `Accordez-nous 2 petites minutes pour votre témoignage, en courte vidéo ou en vocal :`,
    link,
    `Merci 🙏`,
  ].join("\n\n");
}
