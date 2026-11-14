import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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
  return NextResponse.json(
    {
      status: intent.status,
      download: intent.status === "paid" ? `/api/guide/${intent.id}` : null,
      answered: Boolean(intent.qualification),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
