const encoder = new TextEncoder();

/** Alphabet sans caractères ambigus (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomId(bytes = 16) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return base64url(buf);
}

/** Longueur des codes d'accès membres (les anciens codes à 8 caractères, « K7PM-Q3XD », restent valides). */
export const ACCESS_CODE_LENGTH = 4;

/** Code d'accès membre, ex. "46TE" : court à recopier depuis un téléphone. */
export function randomAccessCode() {
  const chars: string[] = [];
  const max = 256 - (256 % CODE_ALPHABET.length);
  while (chars.length < ACCESS_CODE_LENGTH) {
    const [byte] = crypto.getRandomValues(new Uint8Array(1));
    if (byte < max) chars.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  }
  return chars.join("");
}

/** Majuscules sans espaces ni tirets ; les anciens codes à 8 caractères gardent leur tiret (forme hachée en base). */
export function normalizeAccessCode(input: string) {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

export async function hmacSha256Hex(secret: string, data: string | Uint8Array) {
  const key = await hmacKey(secret);
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return toHex(await crypto.subtle.sign("HMAC", key, bytes));
}

export async function hmacSha256B64(secret: string, data: string) {
  const key = await hmacKey(secret);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64url(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = await pbkdf2(password, fromBase64url(salt), Number(iterations));
  return timingSafeEqual(actual, expected);
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return base64url(new Uint8Array(bits));
}
