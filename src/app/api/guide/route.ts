import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createChariowCheckout } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { GUIDE_CTA_ID, GUIDE_PRICE, GUIDE_TITLE, guideProductId } from "@/lib/guide";
import { normalizeEmail } from "@/lib/members";
import { browserContext, metaAllowedForRequest, metaEventId, sendMetaEventInBackground } from "@/lib/meta-capi";
import { internationalPhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = { name?: string; email?: string; phone?: string; countryCode?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Achat du guide d'entrée (1 900 FCFA) : enregistre l'intention (visiteur, email, attribution) puis renvoie l'URL de
 * paiement Chariow. Au retour, /merci?i=<intention> confirme le paiement et donne le lien du guide ; la livraison par
 * email et la fiche CRM sont faites par le webhook Chariow (src/lib/chariow.ts, processGuideSale).
 */
export async function POST(request: NextRequest) {
  const productId = guideProductId();
  if (!productId) {
    return NextResponse.json({ error: "Le paiement en ligne du guide n'est pas encore disponible. Écrivez-nous sur WhatsApp." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = normalizeEmail(body.email || "");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CI").toUpperCase().slice(0, 2);
  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({ error: "Merci de renseigner votre nom, un email valide et votre numéro." }, { status: 400 });
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
    metaContext: metaBrowser ? JSON.stringify(metaBrowser) : null,
  });
  if (visitorId) {
    await recordServerEvent({ visitorId, type: "checkout_start", path: "/guide-budget", ctaId: GUIDE_CTA_ID }).catch(() => {});
  }

  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: GUIDE_CTA_ID, produit: "guide_budget" };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;

  const [firstName, ...rest] = name.split(" ");
  const checkout = await createChariowCheckout({
    productId,
    customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
    intentId,
    redirectUrl: `${request.nextUrl.origin}/merci?i=${intentId}`,
    metadata,
    customerIp: clientIp(request.headers),
  });
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });

  // API de conversion Meta : même event_id que le Pixel de la page de vente (déduplication).
  const metaEventIdValue = metaBrowser ? metaEventId("ic") : null;
  if (metaBrowser && metaEventIdValue) {
    sendMetaEventInBackground({
      eventName: "InitiateCheckout",
      eventId: metaEventIdValue,
      eventSourceUrl: `${request.nextUrl.origin}/guide-budget`,
      user: { email, phone: internationalPhone(phone, countryCode), name, country: countryCode, externalId: visitorId },
      browser: metaBrowser,
      customData: { content_name: GUIDE_TITLE, content_ids: [GUIDE_CTA_ID], content_type: "product", value: GUIDE_PRICE, currency: "XAF" },
    });
  }
  const response = NextResponse.json({ url: checkout.url, mode: checkout.mode, intentId, metaEventId: metaEventIdValue });
  response.cookies.set(INTENT_COOKIE, intentId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });
  return response;
}
