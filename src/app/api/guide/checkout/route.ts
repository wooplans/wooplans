import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/db";
import { createChariowCheckout } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { GUIDE, GUIDE_CTA_ID, GUIDE_PATH, guideEnabled, guideProductId, parseHeardFrom } from "@/lib/guide";
import { normalizeEmail } from "@/lib/members";
import { browserContext, metaAllowedForRequest, metaEventId, sendMetaEventInBackground } from "@/lib/meta-capi";
import { internationalPhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = { name?: string; email?: string; phone?: string; countryCode?: string; heardFrom?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Achat du Guide WooPlans des maisons : intention (attribution, « comment nous avez-vous connu ? ») puis paiement Chariow. */
export async function POST(request: NextRequest) {
  if (!guideEnabled()) return NextResponse.json({ error: "Le guide sera bientôt disponible." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = normalizeEmail(body.email || "");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CM").toUpperCase().slice(0, 2);
  const heardFrom = parseHeardFrom(body.heardFrom);
  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({ error: "Merci de renseigner votre nom, un email valide et votre numéro WhatsApp." }, { status: 400 });
  }
  if (!(await rateLimit(`guide:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
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
    ctaId: GUIDE_CTA_ID,
    heardFrom,
    metaContext: metaBrowser ? JSON.stringify(metaBrowser) : null,
  });
  if (visitorId) await recordServerEvent({ visitorId, type: "checkout_start", path: GUIDE_PATH, ctaId: GUIDE_CTA_ID }).catch(() => {});

  const visitor = visitorId ? await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: GUIDE_CTA_ID };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;
  if (heardFrom) metadata.heard_from = heardFrom;

  const [firstName, ...rest] = name.split(" ");
  const checkout = await createChariowCheckout({
    customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
    intentId,
    redirectUrl: siteUrl(`${GUIDE_PATH}/merci?i=${intentId}`),
    metadata,
    customerIp: clientIp(request.headers),
    productId: guideProductId(),
  });
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });

  const eventId = metaBrowser ? metaEventId("ic") : null;
  if (metaBrowser && eventId) {
    sendMetaEventInBackground({
      eventName: "InitiateCheckout",
      eventId,
      eventSourceUrl: siteUrl(GUIDE_PATH),
      user: { email, phone: internationalPhone(phone, countryCode), name, country: countryCode, externalId: visitorId },
      browser: metaBrowser,
      customData: { content_name: "Guide WooPlans des maisons", content_ids: ["guide-maisons"], content_type: "product", value: GUIDE.price, currency: "XAF" },
    });
  }
  const response = NextResponse.json({ url: checkout.url, intentId, metaEventId: eventId });
  response.cookies.set(INTENT_COOKIE, intentId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });
  return response;
}
