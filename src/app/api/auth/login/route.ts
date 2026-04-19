import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const mode = body.mode;
    const email = body.email?.trim().toLowerCase();

    if (!mode || !email) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    if (mode === "admin") {
      if (!body.password) {
        return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
      }

      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) {
        return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
      }

      const isValid = await compare(body.password, admin.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
      }

      const user: SessionUser = { id: admin.id, email: admin.email, role: "admin" };
      const token = await createSessionToken(user, 60 * 60 * 24 * 14);
      const response = NextResponse.json({ ok: true, user, redirectTo: body.callbackUrl || "/admin" });
      applySessionCookie(response, token, 60 * 60 * 24 * 14);
      return response;
    }

    if (mode === "subscriber") {
      if (!body.premiumCode) {
        return NextResponse.json({ error: "Code premium requis" }, { status: 400 });
      }

      const subscriber = await prisma.subscriber.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          premiumCode: true,
          isActive: true,
          expiresAt: true,
        },
      });

      if (!subscriber || !subscriber.premiumCode || !subscriber.isActive) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
      }

      if (subscriber.premiumCode !== body.premiumCode.trim()) {
        return NextResponse.json({ error: "Code premium incorrect" }, { status: 401 });
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
        redirectTo: body.callbackUrl || "/plans",
      });
      applySessionCookie(response, token, 60 * 60 * 24 * 30);
      return response;
    }

    return NextResponse.json({ error: "Mode inconnu" }, { status: 400 });
  } catch (error) {
    console.error("Auth login error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}

