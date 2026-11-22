import { and, desc, eq, inArray } from "drizzle-orm";
import catalogue from "@/config/catalogue.json";
import { getDb, schema } from "@/db";
import { activePromo, chooseOffer, offerProductIds, reservedUntil, type CatalogueConfig, type Offer } from "@/lib/catalogue-offer-rules";
import { leadProductIds } from "@/lib/lead-offers";
import { normalizeEmail } from "@/lib/members";
import { isCustomer } from "@/lib/prospects";

/**
 * Prix du Catalogue Premium proposé à une personne (règles : src/lib/catalogue-offer-rules.ts).
 * Reconnaissance d'un acheteur de l'extrait ou du guide, du moins au plus de friction :
 *  1. son lien personnel (/r/<id>.offre, relances WhatsApp et emails) ou le cookie posé par sa page merci ;
 *  2. l'email saisi dans le formulaire de paiement (le serveur choisit alors le produit Chariow du prix réservé).
 * Sinon : prix public.
 */
export const CATALOGUE: CatalogueConfig = catalogue as CatalogueConfig;
/** Cookie de reconnaissance (identifiant de la fiche prospect, 30 jours). */
export const RESERVED_COOKIE = "wp_res";
export const RESERVED_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export { deadlineLabel, type Offer } from "@/lib/catalogue-offer-rules";

export function publicOffer(): Offer {
  return chooseOffer(CATALOGUE, {});
}

/** Produits Chariow du catalogue aux trois prix. */
export function catalogueOfferProductIds() {
  return offerProductIds(CATALOGUE);
}

/** Dernier achat payé de l'extrait ou du guide de cet email. */
async function leadPurchaseAt(email: string): Promise<Date | null> {
  const ids = leadProductIds();
  if (ids.length === 0) return null;
  const sale = await getDb().query.sales.findFirst({
    where: and(eq(schema.sales.email, email), eq(schema.sales.status, "completed"), inArray(schema.sales.productId, ids)),
    orderBy: desc(schema.sales.occurredAt),
    columns: { occurredAt: true },
  });
  return sale?.occurredAt ?? null;
}

/** Date de fin du prix réservé d'un email (null : pas acheteur de l'extrait/du guide, ou déjà client du catalogue). */
export async function reservedUntilForEmail(email: string | null | undefined): Promise<Date | null> {
  const key = normalizeEmail(email || "");
  if (!key) return null;
  const [purchasedAt, prospect] = await Promise.all([
    leadPurchaseAt(key),
    getDb().query.prospects.findFirst({ where: eq(schema.prospects.email, key), columns: { offerReopenUntil: true, phone: true } }),
  ]);
  const until = reservedUntil(purchasedAt, prospect?.offerReopenUntil ?? null, CATALOGUE.reserved.days);
  if (!until) return null;
  if (await isCustomer(key, prospect?.phone)) return null;
  return until;
}

/** Fiche prospect d'un lien personnel ou du cookie (identifiant aléatoire de la fiche). */
export async function prospectByToken(token: string | null | undefined) {
  const id = (token || "").trim();
  if (!id || id.length > 64) return null;
  return (await getDb().query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { id: true, email: true, name: true } })) ?? null;
}

/**
 * Offre d'une personne : promo datée (?promo=), sinon prix réservé si on la reconnaît (jeton, puis email),
 * sinon prix public.
 */
export async function offerFor(input: { token?: string | null; email?: string | null; promo?: string | null }, now = new Date()) {
  const promo = activePromo(CATALOGUE.promos, input.promo, now);
  const prospect = await prospectByToken(input.token);
  let until = prospect ? await reservedUntilForEmail(prospect.email) : null;
  if (!until && input.email) until = await reservedUntilForEmail(input.email);
  return { offer: chooseOffer(CATALOGUE, { reservedUntil: until, promo }, now), prospect };
}
