export async function verifyChariowSignature(
  raw: Uint8Array,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(signature.slice(7).match(/../g)!, (hex) =>
    parseInt(hex, 16),
  );
  return crypto.subtle.verify("HMAC", key, bytes, raw);
}
