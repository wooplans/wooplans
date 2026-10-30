import { NextResponse, type NextRequest } from "next/server";
import { and, count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { customPlanOffer, planGiftEnabled } from "@/lib/custom-plans";
import { giftPlanEmail, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { formatFcfa, getPublicPlan } from "@/lib/plans";
import { recordProspectEvent } from "@/lib/prospects";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE } from "@/lib/session";
import { cataloguePrice } from "@/lib/site";
import { recordServerEvent } from "@/lib/tracking";
import { unsubscribeUrl } from "@/lib/unsubscribe";

type Body = { slug?: string; name?: string; email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Adresses du propriétaire : cadeaux illimités (contrôle des documents de chaque modèle), sans limite de débit. */
const UNLIMITED_EMAILS = new Set(["wooplans237@gmail.com", "romualdtwk@gmail.com"]);

/**
 * « Recevez gratuitement le plan et devis » (fiche modèle) : un cadeau par adresse email, envoyé par email
 * (lien personnel, document marqué au nom du visiteur), puis séquence de bienvenue vers le Catalogue Premium.
 */
export async function POST(request: NextRequest) {
  if (!planGiftEnabled()) return NextResponse.json({ error: "Offre indisponible." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = normalizeEmail(body.email || "");
  if (name.length < 2 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Merci de renseigner votre nom et un email valide." }, { status: 400 });
  }
  const plan = await getPublicPlan((body.slug || "").slice(0, 120));
  if (!plan || !customPlanOffer(plan.category)) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  const owner = UNLIMITED_EMAILS.has(email);
  if (!owner && !(await rateLimit(`cadeau:${clientIp(request.headers)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const db = getDb();
  const member = await db.query.members.findFirst({
    where: and(eq(schema.members.email, email), eq(schema.members.status, "active")),
    columns: { id: true },
  });
  if (member && !owner) {
    return NextResponse.json({ status: "member", message: "Vous êtes déjà membre Premium : ce modèle est dans votre espace." });
  }
  // Un seul cadeau par adresse email (tous modèles confondus) : la suite logique est le Catalogue Premium.
  const previous = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.email, email), eq(schema.checkoutIntents.status, "gift")),
    orderBy: desc(schema.checkoutIntents.createdAt),
    columns: { planSlug: true },
  });
  if (previous && !owner) {
    const first = previous.planSlug ? await getPublicPlan(previous.planSlug) : null;
    return NextResponse.json({
      status: "already",
      message: `Vous avez déjà reçu votre plan et devis gratuit${first ? ` (modèle ${first.code})` : ""}. Pensez à regarder dans vos spams.`,
      next: {
        text: `Pour recevoir aussi celui du modèle ${plan.code} et de tous les autres modèles, rejoignez le Catalogue Premium : ${formatFcfa(cataloguePrice())}, paiement unique.`,
        href: "/catalogue-premium?utm_source=site&utm_medium=cadeau&utm_campaign=deuxieme_plan",
        label: "Découvrir le Catalogue Premium",
      },
    });
  }

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const intentId = randomId();
  await db.insert(schema.checkoutIntents).values({ id: intentId, visitorId, email, ctaId: "cadeau", planSlug: plan.slug, status: "gift" });
  if (visitorId) await recordServerEvent({ visitorId, type: "gift_request", path: `/catalogue/${plan.slug}`, ctaId: "cadeau" }).catch(() => {});

  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  await recordProspectEvent({
    email,
    name,
    event: "gift",
    occurredAt: new Date(),
    source: "gift",
    utmSource: visitor?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? null,
    startSequence: true,
    kind: "bienvenue",
  });

  const [published] = await db.select({ n: count() }).from(schema.plans).where(eq(schema.plans.status, "published"));
  const unsubscribe = await unsubscribeUrl(email, "prospects");
  const mail = giftPlanEmail({
    name,
    planName: plan.name,
    planCode: plan.code,
    downloadUrl: siteUrl(`/api/plan-devis/${intentId}`),
    catalogueUrl: siteUrl("/catalogue-premium?utm_source=email&utm_medium=bienvenue&utm_campaign=cadeau"),
    price: formatFcfa(cataloguePrice()),
    planCount: published?.n ?? 0,
    unsubscribe,
  });
  // Email demandé par la personne (document) : sans en-têtes de liste de diffusion, qui le classent en « Promotions ».
  // Le lien de désinscription reste en bas de l'email ; la séquence de bienvenue garde ses en-têtes.
  const sent = await sendEmail({ to: email, ...mail, template: "cadeau_plan_devis" });
  if (!sent.ok) {
    // Pas de cadeau compté si l'email n'est pas parti : la personne peut réessayer.
    await db.delete(schema.checkoutIntents).where(eq(schema.checkoutIntents.id, intentId));
    return NextResponse.json({ error: "L'email n'a pas pu partir. Vérifiez votre adresse et réessayez." }, { status: 502 });
  }
  return NextResponse.json({ status: "sent", message: `C'est envoyé ! Le plan et devis du modèle ${plan.code} vous attend dans votre boîte email.` });
}
