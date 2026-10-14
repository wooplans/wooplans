import { serverEnv } from "@/lib/server-env";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "wooplans_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionRole = "admin" | "subscriber";

export type SessionUser = {
  id: string;
  email: string;
  role: SessionRole;
  isActive?: boolean;
  expiresAt?: string | null;
};

export type AppSession = {
  user: SessionUser;
  iat: number;
  exp: number;
};

type CookieCarrier = {
  headers: {
    get(name: string): string | null;
  };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getAuthSecret() {
  if (process.env.NODE_ENV === "production" && !serverEnv("AUTH_SECRET") && !serverEnv("NEXTAUTH_SECRET")) throw new Error("AUTH_SECRET required in production");
  return (
    serverEnv("AUTH_SECRET") ||
    serverEnv("NEXTAUTH_SECRET") ||
    "wooplans-dev-secret"
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = normalized + (padding ? "=".repeat(4 - padding) : "");
  return base64ToBytes(padded);
}

function utf8ToBase64Url(value: string) {
  return base64UrlEncode(encoder.encode(value));
}

function base64UrlToUtf8(value: string) {
  return decoder.decode(base64UrlDecode(value));
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(secret: string, value: string) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return new Uint8Array(signature);
}

async function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left[i] ^ right[i];
  }

  return result === 0;
}

function parseCookieHeader(cookieHeader: string | null) {
  const cookies = new Map<string, string>();

  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies.set(rawKey, decodeURIComponent(rawValue.join("=") || ""));
  }

  return cookies;
}

export function getSessionCookieOptions(maxAgeSeconds = DEFAULT_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export function applySessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds = DEFAULT_SESSION_TTL_SECONDS,
) {
  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(maxAgeSeconds));
  return response;
}

export async function createSessionToken(
  user: SessionUser,
  maxAgeSeconds = DEFAULT_SESSION_TTL_SECONDS,
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AppSession = {
    user,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadPart = utf8ToBase64Url(payloadJson);
  const signature = await hmacSign(getAuthSecret(), payloadPart);
  const signaturePart = base64UrlEncode(signature);

  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionToken(token?: string | null): Promise<AppSession | null> {
  if (!token) return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  let expectedSignature: Uint8Array;
  let actualSignature: Uint8Array;
  try {
    expectedSignature = await hmacSign(getAuthSecret(), payloadPart);
    actualSignature = base64UrlDecode(signaturePart);
  } catch { return null; }

  if (!(await timingSafeEqual(expectedSignature, actualSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToUtf8(payloadPart)) as AppSession;
    if (!payload?.user?.id || !payload?.user?.email || !payload?.user?.role) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    if (
      payload.user.role === "subscriber" &&
      payload.user.expiresAt &&
      new Date(payload.user.expiresAt).getTime() <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: CookieCarrier) {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return verifySessionToken(cookies.get(SESSION_COOKIE));
}

export async function requireRole(request: CookieCarrier, role: SessionRole) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== role) {
    return null;
  }

  return session;
}
