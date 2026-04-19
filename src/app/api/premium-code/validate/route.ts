import { NextResponse } from "next/server";

export const runtime = "edge";
export async function POST(request: Request) {
  const { premiumCode, email } = await request.json();

  if (!premiumCode || !email) {
    return NextResponse.json(
      { valid: false, error: "Code premium et email requis" },
      { status: 400 }
    );
  }

  try {
    const subscriber = await import("@/lib/prisma").then((m) =>
      m.prisma.subscriber.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          premiumCode: true,
          isActive: true,
          expiresAt: true,
        },
      })
    );

    if (!subscriber || !subscriber.premiumCode) {
      return NextResponse.json({ valid: false, error: "Code premium invalide" });
    }

    if (!subscriber.isActive) {
      return NextResponse.json({ valid: false, error: "Accès désactivé" });
    }

    if (subscriber.premiumCode !== premiumCode) {
      return NextResponse.json({ valid: false, error: "Code premium incorrect" });
    }

    if (subscriber.expiresAt && new Date(subscriber.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: "Accès expiré" });
    }

    return NextResponse.json({
      valid: true,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        isActive: subscriber.isActive,
        expiresAt: subscriber.expiresAt,
      },
    });
  } catch (error) {
    console.error("Premium code validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Erreur de validation" },
      { status: 500 }
    );
  }
}
