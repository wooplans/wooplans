import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createChariowCheckout, planProductId } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { customPlanOffer } from "@/lib/custom-plans";
import { getEnv } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { getPublicPlan } from "@/lib/plans";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE, VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = { slug?: string; name?: string; email?: string; phone?: string; countryCode?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Achat du plan et devis d'un modèle : enregistre l'intention (modèle choisi, visiteur, email)
 * puis renvoie l'URL de paiement Chariow. Le modèle est relu à la confirmation du paiement.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  const productId = planProductId();
  if (env.OFFRE_PROJET !== "1" || !productId) {
    return NextResponse.json({ error: "Le paiement en ligne n'est pas encore disponible. Écrivez-nous sur WhatsApp." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = normalizeEmail(body.email || "");
  const phone = (body.phone || "").replace(/\D/g, "");
  const countryCode = (body.countryCode || "CM").toUpperCase().slice(0, 2);
  if (name.length < 2 || !EMAIL_RE.test(email) || phone.length < 6) {
    return NextResponse.json({ error: "Merci de renseigner votre nom, un email valide et votre numéro." }, { status: 400 });
  }
  const plan = await getPublicPlan((body.slug || "").slice(0, 120));
  if (!plan || !customPlanOffer(plan.category)) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  if (!(await rateLimit(`plan-devis:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const db = getDb();
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const intentId = randomId();
  const ctaId = "plan_devis";
  await db.insert(schema.checkoutIntents).values({ id: intentId, visitorId, email, ctaId, planSlug: plan.slug });
  if (visitorId) {
    await recordServerEvent({ visitorId, type: "checkout_start", path: `/catalogue/${plan.slug}`, ctaId }).catch(() => {});
  }

  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  const metadata: Record<string, string> = { cta_id: ctaId, plan_slug: plan.slug, plan_code: plan.code };
  if (visitor?.utmSource) metadata.utm_source = visitor.utmSource;
  if (visitor?.utmCampaign) metadata.utm_campaign = visitor.utmCampaign;

  const [firstName, ...rest] = name.split(" ");
  // Retour sur le site d'où vient l'acheteur (le site public, ou l'aperçu pendant les essais).
  const checkout = await createChariowCheckout({
    productId,
    customer: { email, firstName, lastName: rest.join(" "), phoneNumber: phone, countryCode },
    intentId,
    redirectUrl: `${request.nextUrl.origin}/merci?i=${intentId}`,
    metadata,
    customerIp: clientIp(request.headers),
  });

  const response = NextResponse.json({ url: checkout.url, mode: checkout.mode, intentId });
  response.cookies.set(INTENT_COOKIE, intentId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 48 });
  return response;
}
