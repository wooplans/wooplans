import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });
  }

  try {
    const subscriber = await prisma.subscriber.update({
      where: { id: params.id },
      data: {
        isActive,
      },
    });

    return NextResponse.json(subscriber);
  } catch (error) {
    console.error("Error updating subscriber:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
