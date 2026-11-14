import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { guideDownloadPath, isGuideIntent } from "@/lib/guide-data";
import { getUpsellPlans } from "@/lib/plans";
import { INTENT_COOKIE } from "@/lib/session";
import { UPSELL, UPSELL_CTA_ID, upsellDeadline } from "@/lib/upsell";
import { offreById } from "@/lib/offres";
import { paymentStatusEvent, processWajubPayment, retrieveWajubPayment, wajubConfigured } from "@/lib/wajub";

/**
 * Statut d'un achat pour la page /merci. Le code n'est révélé qu'au navigateur
 * qui a lancé l'achat (cookie), et seulement quelques heures après le paiement.
 */
export async function GET(request: NextRequest) {
  const intentId = request.nextUrl.searchParams.get("i") || request.cookies.get(INTENT_COOKIE)?.value;
  if (!intentId) return NextResponse.json({ status: "unknown" });

  let intent = await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) });
  if (!intent) return NextResponse.json({ status: "unknown" });

  // Paiement Wajub : relu à la source sans attendre la notification (même traitement, idempotent).
  if (intent.status === "started" && intent.saleId?.startsWith("trx_") && wajubConfigured()) {
    const payment = await retrieveWajubPayment(intent.saleId).catch(() => null);
    const saleEvent = paymentStatusEvent(payment?.status);
    if (payment && saleEvent) {
      await processWajubPayment(payment, saleEvent).catch((error) => console.error("Wajub : confirmation au retour impossible", error));
      intent = (await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) })) ?? intent;
    }
  }

  const sameBrowser = request.cookies.get(INTENT_COOKIE)?.value === intent.id;
  const revealable =
    intent.status === "paid" && sameBrowser && intent.revealCode && intent.revealUntil && intent.revealUntil > new Date();

  // Plan et devis d'un modèle : l'identifiant de l'achat est lui-même le lien de téléchargement.
  const plan = intent.planSlug
    ? await getDb().query.plans.findFirst({
        where: eq(schema.plans.slug, intent.planSlug),
        columns: { slug: true, code: true, name: true, category: true },
      })
    : null;

  // Offre « plan et devis + Catalogue Premium offert » : accès Premium (code), le modèle est dans les fiches PDF.
  const offre = intent.offer ? offreById(intent.offer) : null;

  // Offre aux clients : 24 h après le paiement, modèles proches de celui acheté.
  let upsell = null;
  if (plan && !offre && intent.status === "paid") {
    const sale = intent.saleId ? await getDb().query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, intent.saleId), columns: { occurredAt: true } }) : null;
    const plans = await getUpsellPlans(plan.slug, 4).catch(() => []);
    upsell = {
      code: UPSELL.code,
      category: plan.category,
      deadline: upsellDeadline(sale?.occurredAt ?? intent.updatedAt).toISOString(),
      plans: plans.map((p) => ({
        slug: p.slug,
        code: p.code,
        name: p.name,
        coverImage: p.coverImage,
        bedrooms: p.bedrooms,
        surfaceTotal: p.surfaceTotal,
        levels: p.levels,
        budgetMin: p.budgetMin,
        budgetMax: p.budgetMax,
      })),
    };
  }

  return NextResponse.json(
    {
      upsell,
      promo: intent.ctaId === UPSELL_CTA_ID,
      status: intent.status,
      email: sameBrowser ? intent.email : null,
      // Offre : le bouton de /merci connecte directement (api/achat/acces), le code n'est pas affiché.
      code: revealable && !offre ? intent.revealCode : null,
      plan: plan ? { slug: plan.slug, code: plan.code, name: plan.name } : null,
      offre: offre ? { id: offre.id, price: offre.price } : null,
      download: plan && !offre && intent.status === "paid" ? `/api/plan-devis/${intent.id}` : null,
      // Guide d'entrée (1 900 FCFA) : le lien personnel apparaît dès que le paiement est confirmé.
      guide: isGuideIntent(intent) ? { download: intent.status === "paid" ? guideDownloadPath(intent.id) : null } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
