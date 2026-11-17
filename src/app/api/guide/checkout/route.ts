import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/db";
import { createChariowCheckout } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { parseHeardFrom } from "@/lib/guide";
import { LEAD_OFFERS } from "@/lib/lead-offers";
import { normalizeEmail } from "@/lib/members";
import { browserContext, metaAllowedForRequest, metaEventId, sendMetaEventInBackground } from "@/lib/meta-capi";
import { internationalPhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = { name?: string; email?: string; phone?: string; countryCode?: string; heardFrom?: string; offer?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Achat du Guide WooPlans des maisons : intention (attribution, « comment nous avez-vous connu ? ») puis paiement Chariow. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  // Offre d'entrée : le guide (par défaut) ou l'extrait du Catalogue Premium.
  const offer = body.offer === "extrait" ? LEAD_OFFERS.extrait : LEAD_OFFERS.guide;
  if (!offer.productId) return NextResponse.json({ error: "Bientôt disponible." }, { status: 404 });
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = normalizeEmail(body.email || "");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CM").toUpperCase().slice(0, 2);
  const heardFrom = parseHeardFrom(body.heardFrom);
  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({ error: "Merci de renseigner votre nom, un email valide et votre numéro WhatsApp." }, { status: 400 });
  }
  if (!(await rateLimit(`lead:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const db = getDb();
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const intentId = randomId();
  const metaBrowser = metaAllowedForRequest(request) ? browserContext(request) : null;
  await db.insert(schema.checkoutIntents).values({
    id: intentId,
    visitorId,
    email,
    ctaId: offer.ctaId,
    heardFrom,
    metaContext: metaBrowser ? JSON.stringify(metaBrowser) : null,
  });
  if (visitorId) await recordServerEvent({ visitorId, type: "checkout_start", path: offer.path, ctaId: offer.ctaId }).catch(() => {});

  const visitor = visitorId ? await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: offer.ctaId };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;
  if (heardFrom) metadata.heard_from = heardFrom;

  const [firstName, ...rest] = name.split(" ");
  const checkout = await createChariowCheckout({
    customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
    intentId,
    redirectUrl: siteUrl(`${offer.path}/merci?i=${intentId}`),
    metadata,
    customerIp: clientIp(request.headers),
    productId: offer.productId,
  });
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });

  const eventId = metaBrowser ? metaEventId("ic") : null;
  if (metaBrowser && eventId) {
    sendMetaEventInBackground({
      eventName: "InitiateCheckout",
      eventId,
      eventSourceUrl: siteUrl(offer.path),
      user: { email, phone: internationalPhone(phone, countryCode), name, country: countryCode, externalId: visitorId },
      browser: metaBrowser,
      customData: { content_name: offer.name, content_ids: [offer.key === "guide" ? "guide-maisons" : "extrait-catalogue"], content_type: "product", value: offer.price, currency: "XAF" },
    });
  }
  const response = NextResponse.json({ url: checkout.url, intentId, metaEventId: eventId });
  response.cookies.set(INTENT_COOKIE, intentId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });
  return response;
}
