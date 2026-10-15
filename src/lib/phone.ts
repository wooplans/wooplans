/**
 * Numéros de téléphone (WhatsApp) : normalisation au format international sans « + »
 * (ex. "22676658258"), utilisable directement dans un lien https://wa.me/<numéro>.
 * Module sans dépendance pour pouvoir être testé isolément.
 */
export type ChariowPhone =
  | string
  | number
  | { number?: string | number | null; formatted?: string | null; country?: { dial_code?: string | null; code?: string | null } | string | null }
  | null
  | undefined;

/** Numéro Chariow (texte, nombre ou objet { number, country.dial_code }) → chiffres avec indicatif. */
export function normalizePhone(phone: ChariowPhone): string | null {
  if (phone === null || phone === undefined) return null;
  let raw: string;
  let dial = "";
  if (typeof phone === "object") {
    raw = String(phone.formatted || phone.number || "");
    if (phone.country && typeof phone.country === "object") dial = (phone.country.dial_code || "").replace(/\D/g, "");
  } else {
    raw = String(phone);
  }
  let digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 6) return null;
  // Numéro local sans indicatif (ex. "676658258" avec country.dial_code "+226") : on ajoute l'indicatif.
  if (dial && !digits.startsWith(dial) && digits.length <= 10) digits = dial + digits.replace(/^0/, "");
  return digits;
}

/** Code pays (ISO) éventuellement fourni avec le numéro Chariow. */
export function phoneCountry(phone: ChariowPhone): string | null {
  if (phone && typeof phone === "object" && phone.country && typeof phone.country === "object") return phone.country.code || null;
  return null;
}

/** Lien WhatsApp « clic pour discuter », ou null si le numéro est inexploitable. */
export function whatsappUrl(phone: string | null | undefined, message?: string) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
