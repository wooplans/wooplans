import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/db";
import { createChariowCheckout } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = {
  mode?: "widget" | "redirect";
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  ctaId?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Démarre un achat : enregistre l'intention (attribution) puis renvoie l'URL de paiement Chariow. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  if (body.mode === "widget") return recordWidgetIntent(request, body);
  const name = (body.name || "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(body.email || "");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CM").toUpperCase().slice(0, 2);

  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({ error: "Merci de renseigner votre nom, un email valide et votre numéro." }, { status: 400 });
  }
  if (!(await rateLimit(`checkout:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const ctaId = (body.ctaId || "sales_page").slice(0, 80);
  const intentId = randomId();
  const db = getDb();
  await db.insert(schema.checkoutIntents).values({ id: intentId, visitorId, email, ctaId });
  if (visitorId) {
    await recordServerEvent({ visitorId, type: "checkout_start", path: "/catalogue-premium", ctaId }).catch(() => {});
  }

  const [firstName, ...rest] = name.split(" ");
  const visitor = visitorId ? await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: ctaId };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;

  const checkout = await createChariowCheckout({
    customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
    intentId,
    redirectUrl: siteUrl(`/merci?i=${intentId}`),
    metadata,
    customerIp: clientIp(request.headers),
  });

  const response = NextResponse.json({ url: checkout.url, mode: checkout.mode, intentId });
  response.cookies.set(INTENT_COOKIE, intentId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 48,
  });
  return response;
}

/**
 * Paiement via le widget Snap Chariow (produit de type « service ») : le client saisit
 * ses coordonnées dans le widget. On enregistre seulement l'intention (visiteur, UTM,
 * bouton) pour attribuer ensuite la vente à sa campagne.
 */
async function recordWidgetIntent(request: NextRequest, body: Body) {
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  if (!visitorId) return NextResponse.json({ ok: true });
  if (!(await rateLimit(`intent:${clientIp(request.headers)}`, 30, 60 * 60 * 1000))) return NextResponse.json({ ok: true });
  const ctaId = (body.ctaId || "sales_page").slice(0, 80);
  await getDb().insert(schema.checkoutIntents).values({ id: randomId(), visitorId, ctaId });
  await recordServerEvent({ visitorId, type: "checkout_start", path: "/catalogue-premium", ctaId }).catch(() => {});
  return NextResponse.json({ ok: true });
}
