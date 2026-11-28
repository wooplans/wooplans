import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/db";
import { createChariowCheckout } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { browserContext, metaAllowedForRequest, metaEventId, sendMetaEventInBackground } from "@/lib/meta-capi";
import { internationalPhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { offerFor, RESERVED_COOKIE } from "@/lib/catalogue-offer";
import { productForCountry, type CatalogueConfig } from "@/lib/catalogue-offer-rules";
import catalogueConfig from "@/config/catalogue.json";
import catalogueEn from "@/config/catalogue-en.json";
import { recordServerEvent } from "@/lib/tracking";
import { PAY_COOKIE, createWajubCheckout, paymentProvider } from "@/lib/wajub";

type Body = {
  mode?: "widget" | "redirect";
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  ctaId?: string;
  /** Code promo Chariow (lien « Code promo » du formulaire) : l'achat passe alors toujours par Chariow. */
  discountCode?: string;
  /** « wajub » : formulaire Wajub de la page de vente (sinon PAYMENT_PROVIDER ou l'aperçu ?paiement=). */
  provider?: string;
  /** Promo datée (?promo= du lien) : 19 000 FCFA seulement pendant ses dates (src/config/catalogue.json). */
  promo?: string;
  /** « en » : page anglaise /en/premium-catalogue (Ghana, Kenya) : produit Chariow de src/config/catalogue-en.json, sans offre réservée ni promo. */
  lang?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Email facultatif (décision de Tao, 26 nov. 2026) : sans email, l'achat est rattaché à la boîte de WOOPLANS
 *  avec une adresse « + » propre à l'acheteur (un compte membre distinct par numéro) ; Tao envoie l'accès sur WhatsApp. */
const FALLBACK_EMAIL = (phone: string) => `romualdtwk+wa${phone}@gmail.com`;

/** Démarre un achat : enregistre l'intention (attribution) puis renvoie l'URL de paiement (Chariow ou Wajub). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  if (body.mode === "widget") return recordWidgetIntent(request, body);
  const name = (body.name || "").trim().replace(/\s+/g, " ");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CM").toUpperCase().slice(0, 2);
  const email = normalizeEmail(body.email || "") || FALLBACK_EMAIL(phone);
  const english = body.lang === "en";
  const discountCode = (body.discountCode || "").trim().slice(0, 100) || undefined;

  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({
      error: english
        ? "Please enter your name and WhatsApp number (and a valid email if you give one)."
        : "Merci de renseigner votre nom et votre numéro WhatsApp (et un email valide si vous en donnez un).",
    }, { status: 400 });
  }
  if (!(await rateLimit(`checkout:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: english ? "Too many attempts. Please try again in a few minutes." : "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const ctaId = (body.ctaId || "sales_page").slice(0, 80);
  if (english) return startEnglishCheckout(request, { name, phone, countryCode, email, ctaId, visitorId });
  const intentId = randomId();
  const db = getDb();
  const metaAllowed = metaAllowedForRequest(request);
  const metaBrowser = metaAllowed ? browserContext(request) : null;
  await db.insert(schema.checkoutIntents).values({
    id: intentId,
    visitorId,
    email,
    ctaId,
    metaContext: metaBrowser ? JSON.stringify(metaBrowser) : null,
  });
  if (visitorId) {
    await recordServerEvent({ visitorId, type: "checkout_start", path: "/catalogue-premium", ctaId }).catch(() => {});
  }

  // Prix décidé par le serveur : réservé (acheteur de l'extrait ou du guide reconnu par son lien, son cookie ou cet email),
  // promo datée, sinon public. Le produit Chariow correspondant est payé (jamais un prix envoyé par le navigateur).
  const { offer, prospect } = await offerFor({ token: request.cookies.get(RESERVED_COOKIE)?.value, email, promo: body.promo });

  const [firstName, ...rest] = name.split(" ");
  const visitor = visitorId ? await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: ctaId, tier: offer.tier };
  // Lien personnel reconnu (cookie) : la vente sera rattachée à cette fiche même si l'email ou le numéro diffèrent.
  if (prospect) metadata.prospect_id = prospect.id;
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;

  const provider = discountCode ? "chariow" : paymentProvider(body.provider || request.cookies.get(PAY_COOKIE)?.value);
  const checkout =
    provider === "wajub"
      ? await createWajubCheckout({
          offer: "catalogue",
          intentId,
          description: "Catalogue Premium WOOPLANS",
          customer: { name, email, phone: internationalPhone(phone, countryCode) },
          callbackUrl: siteUrl(`/merci?i=${intentId}`),
          metadata: { ...metadata, country: countryCode },
          amount: offer.price,
        }).then((r) => ("error" in r ? r : { url: r.url, mode: "wajub" as const }))
      : await createChariowCheckout({
          customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
          intentId,
          redirectUrl: siteUrl(`/merci?i=${intentId}`),
          metadata,
          customerIp: clientIp(request.headers),
          productId: productForCountry(catalogueConfig as CatalogueConfig, offer, countryCode),
          discountCode,
        });

  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });

  // API de conversion Meta : même event_id que le Pixel de la page de vente (déduplication).
  const metaEventIdValue = metaBrowser ? metaEventId("ic") : null;
  if (metaBrowser && metaEventIdValue) {
    sendMetaEventInBackground({
      eventName: "InitiateCheckout",
      eventId: metaEventIdValue,
      eventSourceUrl: siteUrl("/catalogue-premium"),
      user: { email, phone: internationalPhone(phone, countryCode), name, country: countryCode, externalId: visitorId },
      browser: metaBrowser,
      customData: {
        content_name: "Catalogue Premium Wooplans",
        content_ids: ["cpbook-premium-2026"],
        content_type: "product",
        value: offer.price,
        currency: "XAF",
      },
    });
  }
  const response = NextResponse.json({ url: checkout.url, mode: checkout.mode, intentId, metaEventId: metaEventIdValue, price: offer.price, tier: offer.tier });
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

/**
 * Achat depuis la page anglaise (décision de Tao, 28 nov. 2026) : produit « Catalogue Premium 39K » au prix public,
 * payé dans la devise du pays (Chariow convertit : montants relevés dans src/config/catalogue-en.json). Les métadonnées
 * portent lang=en pour ouvrir ensuite l'espace Premium anglais.
 */
async function startEnglishCheckout(
  request: NextRequest,
  p: { name: string; phone: string; countryCode: string; email: string; ctaId: string; visitorId: string | null },
) {
  const intentId = randomId();
  const db = getDb();
  const metaAllowed = metaAllowedForRequest(request);
  const metaBrowser = metaAllowed ? browserContext(request) : null;
  await db.insert(schema.checkoutIntents).values({ id: intentId, visitorId: p.visitorId, email: p.email, ctaId: p.ctaId, metaContext: metaBrowser ? JSON.stringify(metaBrowser) : null });
  if (p.visitorId) await recordServerEvent({ visitorId: p.visitorId, type: "checkout_start", path: "/en/premium-catalogue", ctaId: p.ctaId }).catch(() => {});
  const visitor = p.visitorId ? await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, p.visitorId!) }) : null;
  const metadata: Record<string, string> = { cta_id: p.ctaId, tier: "public", lang: "en" };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;
  const [firstName, ...rest] = p.name.split(" ");
  const checkout = await createChariowCheckout({
    customer: { email: p.email, firstName, lastName: rest.join(" "), phoneNumber: p.phone, countryCode: p.countryCode },
    intentId,
    redirectUrl: siteUrl(`/merci?i=${intentId}&lang=en`),
    metadata,
    customerIp: clientIp(request.headers),
    productId: catalogueEn.productId,
  });
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 400 });
  const metaEventIdValue = metaBrowser ? metaEventId("ic") : null;
  if (metaBrowser && metaEventIdValue) {
    sendMetaEventInBackground({
      eventName: "InitiateCheckout",
      eventId: metaEventIdValue,
      eventSourceUrl: siteUrl("/en/premium-catalogue"),
      user: { email: p.email, phone: internationalPhone(p.phone, p.countryCode), name: p.name, country: p.countryCode, externalId: p.visitorId },
      browser: metaBrowser,
      customData: { content_name: "Premium Catalogue EN", content_ids: ["cpbook-premium-2026"], content_type: "product", value: catalogueEn.priceXaf, currency: "XAF" },
    });
  }
  const response = NextResponse.json({ url: checkout.url, mode: checkout.mode, intentId, metaEventId: metaEventIdValue, price: catalogueEn.priceXaf, tier: "public" });
  response.cookies.set(INTENT_COOKIE, intentId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });
  return response;
}
