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
    const { modelSlug, selected } = (await request.json()) as {
      modelSlug?: unknown;
      selected?: unknown;
    };
    if (
      typeof modelSlug !== "string" ||
      typeof selected !== "boolean" ||
      !(await getPlanBySlug(modelSlug))?.published
    )
      return NextResponse.json({ error: "Modèle invalide" }, { status: 400 });
    await ensureD1Schema();
    const db = getPrisma();
    if (selected)
      await db.favorite.upsert({
        where: {
          subscriberId_modelSlug: { subscriberId: session.user.id, modelSlug },
        },
        create: { subscriberId: session.user.id, modelSlug },
        update: {},
      });
    else
      await db.favorite.deleteMany({
        where: { subscriberId: session.user.id, modelSlug },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Impossible de modifier les favoris" },
      { status: 400 },
    );
  }
}
