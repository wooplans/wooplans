/**
 * Vérification de la signature d'une notification Wajub :
 * en-tête X-Wajub-Signature « v1=<hex> » = HMAC-SHA256("<timestamp>.<corps brut>") avec le secret
 * de l'endpoint (whsec_…), X-Wajub-Timestamp en secondes, écart toléré de 5 min (anti-rejeu).
 * Module sans dépendance pour pouvoir être testé isolément.
 */
export const WAJUB_SIGNATURE_TOLERANCE_S = 300;

export async function verifyWajubSignature(
  rawBody: Uint8Array,
  header: string | null,
  timestamp: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!header || !header.startsWith("v1=") || !timestamp || !/^\d+$/.test(timestamp) || !secret) return false;
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.length + rawBody.length);
  signed.set(prefix);
  signed.set(rawBody, prefix.length);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  const expected = `v1=${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  // Horodatage contrôlé après la signature (il en fait partie) : une notification capturée ne peut pas être rejouée.
  return diff === 0 && Math.abs(nowSeconds - Number(timestamp)) <= WAJUB_SIGNATURE_TOLERANCE_S;
}
