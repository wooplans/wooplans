import { serverEnv } from "@/lib/server-env";
import { allowLoginAttempt } from "@/lib/login-limit";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  applySessionCookie,
  createSessionToken,
  type SessionRole,
  type SessionUser,
} from "@/lib/auth";

export const runtime = "edge";

type LoginBody = {
  mode?: SessionRole;
  email?: string;
  password?: string;
  premiumCode?: string;
  callbackUrl?: string;
};

function safeCallback(value: string | undefined, fallback: string) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const mode = body.mode;
    const email = body.email?.trim().toLowerCase();
    const adminEmail = (serverEnv("ADMIN_EMAIL") || "admin@wooplans.com")
      .trim()
      .toLowerCase();

    if (!mode || !email) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    if (!(await allowLoginAttempt(email)))
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 },
      );

    if (mode === "admin") {
      const admin = await getPrisma().admin.findUnique({ where: { email } });
      if (
        email !== adminEmail ||
        !admin ||
        !body.password ||
        !(await compare(body.password, admin.passwordHash))
      ) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
      }

      const user: SessionUser = {
        id: admin.id,
        email,
        role: "admin",
      };
      const token = await createSessionToken(user, 60 * 60 * 24 * 14);
      const response = NextResponse.json({
        ok: true,
        user,
        redirectTo: safeCallback(body.callbackUrl, "/admin"),
      });
      applySessionCookie(response, token, 60 * 60 * 24 * 14);
      return response;
    }

    if (mode === "subscriber") {
      if (!body.premiumCode) {
        return NextResponse.json(
          { error: "Code premium requis" },
          { status: 400 },
        );
      }

      const prisma = getPrisma();
      const subscriber = await prisma.subscriber.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          premiumCode: true,
          chariowLicenseKey: true,
          isActive: true,
          expiresAt: true,
        },
      });

      if (!subscriber || !subscriber.premiumCode || !subscriber.isActive) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
      }

      if (
        subscriber.premiumCode !== body.premiumCode.trim() &&
        subscriber.chariowLicenseKey !== body.premiumCode.trim()
      ) {
        return NextResponse.json(
          { error: "Code premium incorrect" },
          { status: 401 },
        );
      }

      if (subscriber.expiresAt && new Date(subscriber.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Accès expiré" }, { status: 401 });
      }

      const user: SessionUser = {
        id: subscriber.id,
        email: subscriber.email,
        role: "subscriber",
        isActive: subscriber.isActive,
        expiresAt: subscriber.expiresAt?.toISOString() || null,
      };
      const token = await createSessionToken(user, 60 * 60 * 24 * 30);
      const response = NextResponse.json({
        ok: true,
        user,
        redirectTo: safeCallback(body.callbackUrl, "/premium"),
      });
      applySessionCookie(response, token, 60 * 60 * 24 * 30);
      return response;
    }

    return NextResponse.json({ error: "Mode inconnu" }, { status: 400 });
  } catch (error) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      { error: "Erreur d'authentification" },
      { status: 500 },
    );
  }
}
