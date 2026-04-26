import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "edge";

export async function GET(request: Request) {
  const session = await requireRole(request, "admin");

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des abonnés" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireRole(request, "admin");

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      isActive?: boolean;
      expiresAt?: string | null;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const prisma = getPrisma();

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });
    }

    const premiumCode = String(Math.floor(1000 + Math.random() * 9000));
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        isActive,
        premiumCode,
        expiresAt,
      },
    });

    return NextResponse.json(subscriber, { status: 201 });
  } catch (error) {
    console.error("Error creating subscriber:", error);
    return NextResponse.json({ error: "Erreur lors de la création de l'abonné" }, { status: 500 });
  }
}
