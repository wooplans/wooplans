/**
 * Demande d'avis audio par WhatsApp : le client ouvre la page /temoignage, écoute le message de WOOPLANS,
 * puis laisse un vocal WhatsApp en suivant 3 questions. Messages préremplis envoyés depuis l'admin.
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
  "Confirmez que vous avez payé le Catalogue Premium en ligne et que vous avez bien reçu votre code d'accès.",
  "Dites ce que vous pensez de la qualité des plans.",
  "Le recommanderiez-vous à quelqu'un qui hésite encore ? Pourquoi ?",
];

/** Texte prérempli quand le client ouvre WhatsApp depuis la page, juste avant d'enregistrer son vocal. */
export const TESTIMONIAL_WHATSAPP_TEXT = "Bonjour WOOPLANS 👋 Voici mon avis sur le Catalogue Premium 🎙️";

/** Prénom pour un message personnel (« M. Francis Bilong » → « Francis »). */
export function firstName(name: string | null | undefined) {
  const words = (name || "").trim().split(/\s+/).filter((w) => !/^(m|mr|mme|mlle|dr|me)\.?$/i.test(w));
  const word = words[0] || "";
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "";
}

/** Message WhatsApp envoyé au client depuis le téléphone de WOOPLANS. */
export function testimonialRequestMessage(params: { name?: string | null; link: string; relaunch?: boolean }) {
  const prenom = firstName(params.name);
  const hello = prenom ? `Bonjour ${prenom} 👋` : "Bonjour 👋";
  if (params.relaunch) {
    return [
      `${hello}, petit rappel de WOOPLANS 🙂`,
      `Auriez-vous 2 minutes pour nous laisser votre avis sur le Catalogue Premium ? Un simple vocal suffit, tout est expliqué ici :`,
      params.link,
      `Merci d'avance 🙏`,
    ].join("\n\n");
  }
  return [
    `${hello}, c'est WOOPLANS. Merci encore d'avoir choisi le Catalogue Premium 🙏`,
    `Pourriez-vous nous accorder 2 petites minutes pour nous laisser votre avis ? Un simple vocal suffit, tout est expliqué ici :`,
    params.link,
    `Merci beaucoup, ça nous aide énormément !`,
  ].join("\n\n");
}

/** Message à publier en statut WhatsApp ou dans une liste de diffusion. */
export function testimonialBroadcastMessage(link: string) {
  return [
    `Vous avez le Catalogue Premium WOOPLANS ? 🏡`,
    `Accordez-nous 2 petites minutes pour nous laisser votre avis en vocal :`,
    link,
    `Merci 🙏`,
  ].join("\n\n");
}
