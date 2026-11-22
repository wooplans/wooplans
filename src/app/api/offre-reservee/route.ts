import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { RESERVED_COOKIE, RESERVED_COOKIE_MAX_AGE, reservedUntilForEmail } from "@/lib/catalogue-offer";
import { normalizeEmail } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: RESERVED_COOKIE_MAX_AGE };

/**
 * Reconnaissance d'un acheteur de l'extrait ou du guide (prix réservé du Catalogue Premium) :
 *  - { email } : email saisi sur la page réservée (repli quand le téléphone n'a pas le cookie) ;
 *  - { intentId } : page merci de l'extrait ou du guide (achat payé de ce navigateur).
 * Répond seulement oui ou non et pose le cookie wp_res si l'offre est en cours.
 */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`offre-reservee:${clientIp(request.headers)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ reserved: false }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; intentId?: string };
  const db = getDb();
  let email = normalizeEmail(body.email || "");
  if (!email && body.intentId) {
    const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, String(body.intentId).slice(0, 64)) });
    if (intent?.status === "paid") email = intent.email || "";
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ reserved: false });
  const until = await reservedUntilForEmail(email);
  const prospect = until ? await db.query.prospects.findFirst({ where: eq(schema.prospects.email, email), columns: { id: true } }) : null;
  const response = NextResponse.json({ reserved: Boolean(until && prospect) });
  if (until && prospect) response.cookies.set(RESERVED_COOKIE, prospect.id, cookieOptions);
  return response;
}
