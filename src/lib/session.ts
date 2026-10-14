import { base64url, fromBase64url, hmacSha256B64, timingSafeEqual } from "@/lib/crypto";
import { requireSecret } from "@/lib/env";

export const MEMBER_COOKIE = "wp_member";
export const ADMIN_COOKIE = "wp_admin";
export const VISITOR_COOKIE = "wp_vid";
export const INTENT_COOKIE = "wp_intent";

export type MemberToken = { kind: "member"; sub: string; ver: number; exp: number };
export type AdminToken = { kind: "admin"; sub: string; exp: number };
type Token = MemberToken | AdminToken;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function signToken(payload: Token) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSha256B64(requireSecret("AUTH_SECRET"), body);
  return `${body}.${sig}`;
}

export async function verifyToken<T extends Token>(token: string | undefined, kind: T["kind"]): Promise<T | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmacSha256B64(requireSecret("AUTH_SECRET"), body);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(decoder.decode(fromBase64url(body))) as Token;
    if (payload.kind !== kind || payload.exp < Date.now()) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const MEMBER_SESSION_DAYS = 180;
export const ADMIN_SESSION_DAYS = 14;
