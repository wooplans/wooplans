/**
 * Vérification de la signature d'une notification Chariow (« Pulse Security ») :
 * HMAC-SHA256 du corps brut avec le secret du Pulse, en-tête « sha256=<hex> ».
 * Module sans dépendance pour pouvoir être testé isolément.
 */
export async function verifyChariowSignature(rawBody: Uint8Array, header: string | null, secret: string) {
  if (!header || !header.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, rawBody));
  const expected = `sha256=${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}
