import { NextResponse } from "next/server";
import { getCurrentSession, hasPremiumAccess } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { getPlanBySlug } from "@/lib/db";
import { ensureD1Schema } from "@/lib/d1-schema";
export const runtime = "edge";
export async function POST(request: Request) {
  if (!(await hasPremiumAccess()))
    return NextResponse.json({ error: "Accès réservé" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  const session = await getCurrentSession();
  if (session?.user.role !== "subscriber")
    return NextResponse.json(
      { error: "Compte membre requis" },
      { status: 403 },
    );
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = Object.fromEntries(
      ["modelSlug", "phone", "location", "terrain", "needs"].map((key) => [
        key,
        typeof body[key] === "string" ? body[key].trim().slice(0, 2000) : "",
      ]),
    ) as Record<string, string>;
    if (Object.values(data).some((v) => !v))
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 },
      );
    if (!(await getPlanBySlug(data.modelSlug))?.published)
      return NextResponse.json(
        { error: "Modèle introuvable" },
        { status: 400 },
      );
    await ensureD1Schema();
    const project = await getPrisma().project.create({
      data: {
        subscriberId: session.user.id,
        modelSlug: data.modelSlug,
        phone: data.phone,
        location: data.location,
        terrain: data.terrain,
        needs: data.needs,
      },
    });
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Impossible d’enregistrer la demande" },
      { status: 400 },
    );
  }
}
