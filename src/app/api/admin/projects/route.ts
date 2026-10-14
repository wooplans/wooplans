import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { ensureD1Schema } from "@/lib/d1-schema";
import { PROJECT_STAGES, parseFinancials } from "@/lib/crm";
export const runtime = "edge";
export async function PATCH(request: Request) {
  if (!(await requireRole(request, "admin")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.id !== "string" ||
      typeof body.status !== "string" ||
      !Object.hasOwn(PROJECT_STAGES, body.status)
    )
      throw new Error("Projet invalide");
    const nextFollowUp = body.nextFollowUp
      ? new Date(String(body.nextFollowUp))
      : null;
    if (nextFollowUp && !Number.isFinite(nextFollowUp.getTime()))
      throw new Error("Date invalide");
    await ensureD1Schema();
    await getPrisma().project.update({
      where: { id: body.id },
      data: {
        status: body.status,
        notes: String(body.notes ?? "").slice(0, 10000),
        nextFollowUp,
        ...parseFinancials(body),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Modification impossible",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireRole(request, "admin")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.subscriberId !== "string" ||
      typeof body.modelSlug !== "string"
    )
      throw new Error("Membre et modèle requis");
    await ensureD1Schema();
    const db = getPrisma();
    const member = await db.subscriber.findUnique({
      where: { id: body.subscriberId },
    });
    const plan = await db.plan.findUnique({ where: { slug: body.modelSlug } });
    if (!member || !plan?.published)
      throw new Error("Membre ou modèle introuvable");
    const project = await db.project.create({
      data: {
        subscriberId: member.id,
        modelSlug: plan.slug,
        phone: String(body.phone || "À préciser").slice(0, 200),
        location: String(body.location || "À préciser").slice(0, 2000),
        terrain: "À préciser",
        needs: String(body.needs || "Demande reçue hors ligne").slice(0, 2000),
      },
    });
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création impossible" },
      { status: 400 },
    );
  }
}
