import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { INTENT_COOKIE } from "@/lib/session";
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
        columns: { slug: true, code: true, name: true },
      })
    : null;

  return NextResponse.json(
    {
      status: intent.status,
      email: sameBrowser ? intent.email : null,
      code: revealable ? intent.revealCode : null,
      plan: plan ?? null,
      download: plan && intent.status === "paid" ? `/api/plan-devis/${intent.id}` : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
