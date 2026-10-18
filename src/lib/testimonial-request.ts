/**
 * Demande de témoignages par WhatsApp : lien personnel signé, message prérempli et
 * contrôle du type réel des fichiers reçus (vidéo ou audio enregistrés depuis un téléphone).
 * Module sans dépendance pour pouvoir être testé isolément.
 */

export type TestimonialKind = "video" | "audio";
export type MediaType = { contentType: string; ext: string };

/** Taille maximale d'un envoi : sous la limite de corps de requête de Cloudflare (100 Mo). */
export const TESTIMONIAL_MAX_BYTES = 95 * 1024 * 1024;
/** Durée maximale d'un enregistrement fait sur la page (secondes). */
export const TESTIMONIAL_MAX_SECONDS = 90;
/** Délai avant de proposer une relance à un membre déjà sollicité. */
export const TESTIMONIAL_RELAUNCH_DAYS = 4;

/** Questions affichées pendant l'enregistrement, comme un prompteur. */
export const TESTIMONIAL_QUESTIONS = [
  "Présentez-vous : votre prénom et votre ville ou pays.",
  "Où en était votre projet de maison avant WOOPLANS ?",
  "Qu'est-ce que le Catalogue Premium vous a apporté ? (choix du modèle, devis, budget…)",
  "Le recommanderiez-vous ? À qui ?",
];

const encoder = new TextEncoder();
const SIGNATURE_LENGTH = 22; // 132 bits de HMAC-SHA256 : lien court à partager sur WhatsApp

function b64url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signature(secret: string, memberId: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`testimonial:${memberId}`)));
  return b64url(mac).slice(0, SIGNATURE_LENGTH);
}

/**
 * Jeton du lien personnel « /temoignage#<jeton> » : identifiant du membre + signature.
 * Sans expiration (un lien envoyé sur WhatsApp doit rester valable) ; il ne permet que d'envoyer un témoignage.
 */
export async function signTestimonialToken(secret: string, memberId: string) {
  if (!secret || secret.length < 16) throw new Error("Secret de signature manquant");
  return `${memberId}.${await signature(secret, memberId)}`;
}

/** Identifiant du membre si le jeton est authentique, sinon null. */
export async function verifyTestimonialToken(secret: string, token: string): Promise<string | null> {
  if (!secret || secret.length < 16 || typeof token !== "string" || token.length > 120) return null;
  const [memberId, sig, extra] = token.split(".");
  if (!memberId || !sig || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(memberId)) return null;
  const expected = await signature(secret, memberId);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? memberId : null;
}

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
      `Votre avis sur le Catalogue Premium nous serait vraiment précieux. Ça prend moins d'une minute, directement depuis votre téléphone (vidéo ou simple audio) :`,
      params.link,
      `Merci d'avance, ça compte beaucoup pour nous 🙏`,
    ].join("\n\n");
  }
  return [
    `${hello}, c'est l'équipe WOOPLANS. Merci encore d'avoir choisi le Catalogue Premium 🙏`,
    `J'ai une petite faveur à vous demander : pourriez-vous nous dire en 30 secondes ce que vous en avez pensé ? Tout se fait depuis votre téléphone, en vidéo ou en audio, sur cette page :`,
    params.link,
    `Votre expérience aidera d'autres familles à se lancer dans leur projet de maison. Merci beaucoup !`,
  ].join("\n\n");
}

/** Message à publier en statut WhatsApp ou dans une liste de diffusion (lien général). */
export function testimonialBroadcastMessage(link: string) {
  return [
    `Vous avez le Catalogue Premium WOOPLANS ? 🏡`,
    `Racontez-nous votre expérience en 30 secondes, en vidéo ou en audio, depuis votre téléphone :`,
    link,
    `Votre témoignage aidera d'autres familles à choisir leur maison. Merci 🙏`,
  ].join("\n\n");
}

/**
 * Type réel d'un enregistrement d'après ses premiers octets : WebM (Chrome, Android), MP4/M4A/MOV (iPhone),
 * Ogg, MP3, AAC, WAV, 3GP. Les conteneurs MP4 servent à la vidéo comme à l'audio : le type déclaré tranche.
 */
export function sniffMediaType(head: Uint8Array, kind: TestimonialKind): MediaType | null {
  const at = (i: number, bytes: number[]) => bytes.every((b, j) => head[i + j] === b);
  const ascii = (i: number, text: string) => at(i, [...text].map((c) => c.charCodeAt(0)));
  if (at(0, [0x1a, 0x45, 0xdf, 0xa3])) return kind === "audio" ? { contentType: "audio/webm", ext: "webm" } : { contentType: "video/webm", ext: "webm" };
  if (ascii(4, "ftyp")) {
    if (ascii(8, "qt  ")) return { contentType: "video/quicktime", ext: "mov" };
    if (ascii(8, "3gp") || ascii(8, "3g2")) return kind === "audio" ? { contentType: "audio/3gpp", ext: "3gp" } : { contentType: "video/3gpp", ext: "3gp" };
    if (ascii(8, "M4A ") || kind === "audio") return { contentType: "audio/mp4", ext: "m4a" };
    return { contentType: "video/mp4", ext: "mp4" };
  }
  if (ascii(4, "moov") || ascii(4, "mdat") || ascii(4, "wide") || ascii(4, "free")) return { contentType: "video/quicktime", ext: "mov" };
  if (ascii(0, "OggS")) return { contentType: "audio/ogg", ext: "ogg" };
  if (ascii(0, "ID3") || (head[0] === 0xff && (head[1] & 0xe6) === 0xe2)) return { contentType: "audio/mpeg", ext: "mp3" };
  if (head[0] === 0xff && (head[1] & 0xf6) === 0xf0) return { contentType: "audio/aac", ext: "aac" };
  if (ascii(0, "RIFF") && ascii(8, "WAVE")) return { contentType: "audio/wav", ext: "wav" };
  if (ascii(0, "#!AMR")) return { contentType: "audio/amr", ext: "amr" };
  return null;
}

/** Nettoie un champ texte saisi par le client (espaces, longueur). */
export function cleanText(value: string | null | undefined, max: number) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
