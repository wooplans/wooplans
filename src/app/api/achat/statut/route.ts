import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { INTENT_COOKIE } from "@/lib/session";

/**
 * Statut d'un achat pour la page /merci. Le code n'est révélé qu'au navigateur
 * qui a lancé l'achat (cookie), et seulement quelques heures après le paiement.
 */
export async function GET(request: NextRequest) {
  const intentId = request.nextUrl.searchParams.get("i") || request.cookies.get(INTENT_COOKIE)?.value;
  if (!intentId) return NextResponse.json({ status: "unknown" });

  const intent = await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) });
  if (!intent) return NextResponse.json({ status: "unknown" });

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
