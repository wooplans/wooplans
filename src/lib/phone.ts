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

/**
 * Pays proposés pour le numéro (Mobile Money) : code ISO attendu par le prestataire de paiement, indicatif et exemple
 * de numéro national (sans l'indicatif), affiché dans le champ selon le pays choisi.
 */
export const PHONE_COUNTRIES = [
  ["CM", "Cameroun", "+237", "6 71 23 45 67"],
  ["CI", "Côte d'Ivoire", "+225", "07 01 23 45 67"],
  ["SN", "Sénégal", "+221", "77 123 45 67"],
  ["GA", "Gabon", "+241", "06 12 34 56"],
  ["CG", "Congo", "+242", "06 612 34 56"],
  ["CD", "RD Congo", "+243", "81 234 5678"],
  ["BJ", "Bénin", "+229", "01 97 12 34 56"],
  ["TG", "Togo", "+228", "90 12 34 56"],
  ["BF", "Burkina Faso", "+226", "70 12 34 56"],
  ["ML", "Mali", "+223", "70 12 34 56"],
  ["GN", "Guinée", "+224", "622 12 34 56"],
  ["NE", "Niger", "+227", "90 12 34 56"],
  ["TD", "Tchad", "+235", "66 12 34 56"],
  ["CF", "Centrafrique", "+236", "70 12 34 56"],
  ["GQ", "Guinée équatoriale", "+240", "222 123 456"],
  ["MA", "Maroc", "+212", "6 12 34 56 78"],
  ["FR", "France", "+33", "6 12 34 56 78"],
  ["BE", "Belgique", "+32", "470 12 34 56"],
  ["CH", "Suisse", "+41", "78 123 45 67"],
  ["DE", "Allemagne", "+49", "151 23456789"],
  ["IT", "Italie", "+39", "312 345 6789"],
  ["ES", "Espagne", "+34", "612 34 56 78"],
  ["GB", "Royaume-Uni", "+44", "7400 123456"],
  ["CA", "Canada", "+1", "514 555 0123"],
  ["US", "États-Unis", "+1", "201 555 0123"],
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number][0];

/** Pays du visiteur s'il est dans la liste, sinon le Cameroun. */
export function phoneCountryOrDefault(code: string | null | undefined): PhoneCountryCode {
  const upper = (code || "").toUpperCase();
  return PHONE_COUNTRIES.find(([c]) => c === upper)?.[0] ?? "CM";
}

/** Numéro national (sans indicatif) + pays (ISO) → format international « +237671234567 », ou null. */
export function internationalPhone(national: string, countryCode: string): string | null {
  const dial = PHONE_COUNTRIES.find(([c]) => c === countryCode.toUpperCase())?.[2];
  const digits = national.replace(/\D/g, "");
  if (!dial || digits.length < 6) return null;
  return `${dial}${digits}`;
}
