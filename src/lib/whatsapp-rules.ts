/** Règles pures de la séquence WhatsApp (testées sous Node, sans dépendance). */

/** Numéro au format international « +225… » (chiffres seulement, indicatif compris), ou null. */
export function waNumber(phone: string | null | undefined) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? `+${digits}` : null;
}

/** Prénom pour « Merci {prénom} » : le premier mot du nom, en majuscule initiale. */
export function firstName(name: string | null | undefined) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  if (!first) return "à vous";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Vérifie la signature d'un appel du webhook Genuka (« t=<unix>,v1=<hex> », HMAC-SHA256 de « t.corps »). */
export async function verifyGenukaSignature(header: string | null, rawBody: string, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(now / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

/** « STOP », « Arrêt », « stopper »… : demande de désinscription. */
export function isStopRequest(text: string) {
  return /^\s*(stop|stopp?er|arr[eê]t(er)?|d[ée]sinscri(re|ption)|unsubscribe)\s*[.!]*\s*$/i.test(text);
}

/** Classement à la fin de la séquence, d'après ce que la personne a fait. */
export function classify(p: { waOptOutAt: Date | null; waClickedAt: Date | null; waRepliedAt: Date | null; waReadAt: Date | null }, customer: boolean): "client" | "desinscrit" | "chaud" | "tiede" | "froid" {
  if (customer) return "client";
  if (p.waOptOutAt) return "desinscrit";
  if (p.waClickedAt || p.waRepliedAt) return "chaud";
  if (p.waReadAt) return "tiede";
  return "froid";
}

