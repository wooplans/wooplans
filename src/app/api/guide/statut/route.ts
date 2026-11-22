import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { LEAD_CTA_IDS, leadOfferByCta } from "@/lib/lead-offers";
import { merciWhatsappText, orderCode } from "@/lib/order-code";
import { syncLeadSales } from "@/lib/lead-sync";
import { rateLimit } from "@/lib/rate-limit";
import { INTENT_COOKIE } from "@/lib/session";
import { deadlineLabel, RESERVED_COOKIE, RESERVED_COOKIE_MAX_AGE, reservedUntilForEmail } from "@/lib/catalogue-offer";

/** Statut d'un achat du guide pour la page de remerciement : le lien de téléchargement apparaît dès le paiement confirmé. */
export async function GET(request: NextRequest) {
  const intentId = request.nextUrl.searchParams.get("i") || request.cookies.get(INTENT_COOKIE)?.value;
  if (!intentId) return NextResponse.json({ status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
  const intent = await getDb().query.checkoutIntents.findFirst({
    where: eq(schema.checkoutIntents.id, intentId),
    columns: { id: true, ctaId: true, status: true, qualification: true, email: true },
  });
  if (!intent || !LEAD_CTA_IDS.includes(intent.ctaId ?? "")) return NextResponse.json({ status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
  // Achat envoyé au Pixel une seule fois par paiement, quel que soit l'onglet ou le navigateur qui rouvre la page
  // (Meta comptait 24 achats pour 16 ventes Chariow les 15-16 nov.) : le premier affichage « payé » réserve l'envoi.
  // Paiement pas encore notifié par Chariow : on va lire la vente nous-mêmes (au plus une fois toutes les 20 s par achat).
  if (intent.status === "started" && (await rateLimit(`lead-sync:${intent.id}`, 1, 20_000).catch(() => false))) {
    await syncLeadSales(20).catch((error) => console.error("Synchro des ventes d'entrée (page merci) : échec", error));
    const fresh = await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intent.id), columns: { status: true } });
    if (fresh) intent.status = fresh.status;
  }
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
  // Message WhatsApp pré-rempli de la page merci : code de commande (rattache le numéro WhatsApp à la fiche) + nom.
  let waText: string | null = null;
  // Prix réservé du Catalogue Premium (29 000 FCFA jusqu'à minuit de J7) : affiché sur la page merci, et ce navigateur
  // est reconnu ensuite sur la page du catalogue (cookie wp_res = fiche prospect).
  let reserved: { until: string; label: string } | null = null;
  let prospectId: string | null = null;
  if (intent.status === "paid") {
    const prospect = intent.email
      ? await getDb().query.prospects.findFirst({ where: eq(schema.prospects.email, intent.email), columns: { id: true, name: true } }).catch(() => null)
      : null;
    prospectId = prospect?.id ?? null;
    const until = intent.email ? await reservedUntilForEmail(intent.email).catch(() => null) : null;
    if (until) reserved = { until: until.toISOString(), label: deadlineLabel(until) };
    const offer = leadOfferByCta(intent.ctaId);
    const product = offer?.key === "extrait" ? "l'Extrait du Catalogue Premium" : "le Guide WooPlans des maisons";
    waText = merciWhatsappText({ product, code: orderCode(intent.id), name: prospect?.name });
  }
  const response = NextResponse.json(
    {
      status: intent.status,
      waText,
      reserved,
      track,
      download: intent.status === "paid" ? `/api/guide/${intent.id}` : null,
      answered: Boolean(intent.qualification),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (reserved && prospectId) {
    response.cookies.set(RESERVED_COOKIE, prospectId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: RESERVED_COOKIE_MAX_AGE });
  }
  return response;
}
