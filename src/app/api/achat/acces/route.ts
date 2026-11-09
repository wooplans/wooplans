import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { verifyMemberCredentials } from "@/lib/members";
import { cookieOptions, INTENT_COOKIE, MEMBER_COOKIE, MEMBER_SESSION_DAYS, signToken } from "@/lib/session";

/**
 * Après le paiement d'une offre « plan et devis + Catalogue Premium offert » : connecte l'acheteur à son
 * Espace Premium sans ressaisir son code. Mêmes conditions que l'affichage du code sur /merci : le navigateur
 * qui a lancé l'achat (cookie), quelques heures après le paiement, avec le code encore valable.
 */
export async function POST(request: NextRequest) {
  const intentId = request.cookies.get(INTENT_COOKIE)?.value;
  const intent = intentId ? await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) }) : null;
  const usable =
    intent?.status === "paid" && intent.email && intent.revealCode && intent.revealUntil && intent.revealUntil > new Date();
  if (!intent || !usable) return NextResponse.json({ error: "Connectez-vous avec le code reçu par email." }, { status: 403 });

  const member = await verifyMemberCredentials(intent.email!, intent.revealCode!);
  if (!member) return NextResponse.json({ error: "Connectez-vous avec le code reçu par email." }, { status: 403 });

  await getDb().update(schema.members).set({ lastLoginAt: new Date() }).where(eq(schema.members.id, member.id));
  const token = await signToken({ kind: "member", sub: member.id, ver: member.sessionVersion, exp: Date.now() + MEMBER_SESSION_DAYS * 86400_000 });
  const response = NextResponse.json({ ok: true, url: "/espace-premium/telechargements" });
  response.cookies.set(MEMBER_COOKIE, token, cookieOptions(MEMBER_SESSION_DAYS * 86400));
  return response;
}
