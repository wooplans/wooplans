import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeEmail, verifyMemberCredentials } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cookieOptions, MEMBER_COOKIE, MEMBER_SESSION_DAYS, signToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = normalizeEmail(body.email || "");
  const code = (body.code || "").trim();
  if (!email || !code) {
    return NextResponse.json({ error: "Indiquez votre email et votre code d'accès." }, { status: 400 });
  }

  const ip = clientIp(request.headers);
  const allowed =
    (await rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000)) && (await rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000));
  if (!allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Patientez 15 minutes avant de réessayer." }, { status: 429 });
  }

  const member = await verifyMemberCredentials(email, code);
  if (!member) {
    return NextResponse.json({ error: "Email ou code incorrect, ou accès inactif." }, { status: 401 });
  }

  await getDb().update(schema.members).set({ lastLoginAt: new Date() }).where(eq(schema.members.id, member.id));
  const token = await signToken({
    kind: "member",
    sub: member.id,
    ver: member.sessionVersion,
    exp: Date.now() + MEMBER_SESSION_DAYS * 86400_000,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MEMBER_COOKIE, token, cookieOptions(MEMBER_SESSION_DAYS * 86400));
  return response;
}
