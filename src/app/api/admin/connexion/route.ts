import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { verifyPassword } from "@/lib/crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS, cookieOptions, signToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!(await rateLimit(`admin-login:${clientIp(request.headers)}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives, patientez 15 minutes." }, { status: 429 });
  }
  const admin = email ? await getDb().query.admins.findFirst({ where: eq(schema.admins.email, email) }) : null;
  if (!admin || !(await verifyPassword(body.password || "", admin.passwordHash))) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }
  const token = await signToken({ kind: "admin", sub: admin.id, exp: Date.now() + ADMIN_SESSION_DAYS * 86400_000 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions(ADMIN_SESSION_DAYS * 86400), sameSite: "strict" });
  return response;
}
