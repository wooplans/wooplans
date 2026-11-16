import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { GUIDE_CTA_ID } from "@/lib/guide";
import { INTENT_COOKIE } from "@/lib/session";

/** Statut d'un achat du guide pour la page de remerciement : le lien de téléchargement apparaît dès le paiement confirmé. */
export async function GET(request: NextRequest) {
  const intentId = request.nextUrl.searchParams.get("i") || request.cookies.get(INTENT_COOKIE)?.value;
  if (!intentId) return NextResponse.json({ status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
  const intent = await getDb().query.checkoutIntents.findFirst({
    where: eq(schema.checkoutIntents.id, intentId),
    columns: { id: true, ctaId: true, status: true, qualification: true },
  });
  if (!intent || intent.ctaId !== GUIDE_CTA_ID) return NextResponse.json({ status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
  // Achat envoyé au Pixel une seule fois par paiement, quel que soit l'onglet ou le navigateur qui rouvre la page
  // (Meta comptait 24 achats pour 16 ventes Chariow les 15-16 nov.) : le premier affichage « payé » réserve l'envoi.
  let track = false;
  if (intent.status === "paid") {
    const claimed = await getDb()
      .update(schema.checkoutIntents)
      .set({ metaContext: sql`json_set(CASE WHEN json_valid(coalesce(${schema.checkoutIntents.metaContext}, '')) THEN ${schema.checkoutIntents.metaContext} ELSE '{}' END, '$.pixel_sent', 1)` })
      .where(and(eq(schema.checkoutIntents.id, intent.id), sql`(CASE WHEN json_valid(coalesce(${schema.checkoutIntents.metaContext}, '')) THEN json_extract(${schema.checkoutIntents.metaContext}, '$.pixel_sent') IS NULL ELSE 1 END) = 1`))
      .returning({ id: schema.checkoutIntents.id })
      .catch(() => null);
    // En cas d'erreur de la base, on envoie quand même (mieux vaut un doublon qu'un achat perdu).
    track = claimed === null || claimed.length > 0;
  }
  return NextResponse.json(
    {
      status: intent.status,
      track,
      download: intent.status === "paid" ? `/api/guide/${intent.id}` : null,
      answered: Boolean(intent.qualification),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
