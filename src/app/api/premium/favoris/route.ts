import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentMember } from "@/lib/auth";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { planId?: string; favorite?: boolean };
  if (!body.planId) return NextResponse.json({ error: "planId requis" }, { status: 400 });

  const db = getDb();
  if (body.favorite) {
    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, body.planId), columns: { id: true } });
    if (!plan) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    await db.insert(schema.favorites).values({ memberId: member.id, planId: plan.id }).onConflictDoNothing();
  } else {
    await db
      .delete(schema.favorites)
      .where(and(eq(schema.favorites.memberId, member.id), eq(schema.favorites.planId, body.planId)));
  }
  return NextResponse.json({ ok: true, favorite: Boolean(body.favorite) });
}
