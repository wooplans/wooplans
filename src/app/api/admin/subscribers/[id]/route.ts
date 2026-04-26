import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "edge";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(request, "admin");

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json()) as { isActive?: unknown };
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(_request, "admin");

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();
    await prisma.subscriber.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
