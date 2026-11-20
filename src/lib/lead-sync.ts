/**
 * Filet de sécurité des offres d'entrée (guide, extrait) : si la notification Chariow (Pulse) n'arrive pas,
 * par exemple parce que le produit n'a pas été coché dans le Pulse, on lit les dernières ventes payées dans l'API
 * Chariow et on les traite comme une notification. Sans effet sur une vente déjà livrée (verrou de l'intention).
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { processSaleEvent, type ChariowSalePayload } from "@/lib/chariow";
import { getEnv } from "@/lib/env";
import { leadProductIds } from "@/lib/lead-offers";

type ApiSale = NonNullable<ChariowSalePayload["sale"]> & {
  id: string;
  product?: ChariowSalePayload["product"];
  customer?: ChariowSalePayload["customer"];
};

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function syncLeadSales(perPage = 50) {
  const apiKey = getEnv().CHARIOW_API_KEY;
  const products = new Set(leadProductIds());
  if (!apiKey || products.size === 0) return { scanned: 0, processed: 0 };
  const url = new URL("https://api.chariow.com/v1/sales");
  url.searchParams.set("status", "completed");
  url.searchParams.set("per_page", String(perPage));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`Chariow API ${res.status}`);
  const body = (await res.json()) as { data?: ApiSale[] };
  const since = Date.now() - WINDOW_MS;
  const sales = (body.data ?? []).filter(
    (s) =>
      s.id &&
      s.product?.id &&
      products.has(s.product.id) &&
      s.customer?.email &&
      new Date(s.completed_at || s.created_at || 0).getTime() >= since,
  );
  if (sales.length === 0) return { scanned: body.data?.length ?? 0, processed: 0 };
  // Ventes déjà livrées : une intention « payée » porte cette vente. On ne regarde pas le statut de la ligne « sales » :
  // Chariow envoie parfois « successful.sale » avant la fin du paiement (vente encore « en attente ») ; la ligne passait
  // alors « completed » sans livraison, et ce filet de sécurité ne la reprenait jamais (vente du Gabon, 20 nov.).
  const delivered = await getDb().query.checkoutIntents.findMany({
    where: and(inArray(schema.checkoutIntents.saleId, sales.map((s) => s.id)), eq(schema.checkoutIntents.status, "paid")),
    columns: { saleId: true },
  });
  const done = new Set(delivered.map((d) => d.saleId));
  let processed = 0;
  for (const s of sales) {
    if (done.has(s.id)) continue;
    const { product, customer, ...sale } = s;
    const outcome = await processSaleEvent({ event: "successful.sale", sale: { ...sale, status: "completed" }, product, customer }).catch((error) => {
      console.error("Synchro des ventes d'entrée : vente non traitée", s.id, error);
      return null;
    });
    if (outcome) processed++;
  }
  return { scanned: body.data?.length ?? 0, processed };
}
