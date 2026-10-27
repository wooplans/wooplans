import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  planProductId,
  processDeliveryOnce,
  processSaleEvent,
  type ChariowSalePayload,
  type PulseOutcome,
  type SaleProvider,
} from "@/lib/chariow";
import { projectStartPrice } from "@/lib/custom-plans";
import { getEnv } from "@/lib/env";
import { cataloguePrice } from "@/lib/site";

export { verifyWajubSignature } from "@/lib/wajub-signature";

/**
 * Paiement Wajub (checkout hébergé, Mobile Money et carte), en essai à côté de Chariow.
 * Le paiement est créé par l'API (POST /payments) avec l'identifiant de l'intention en référence et en
 * métadonnée ; la notification signée payment.* est mise au format d'une vente Chariow puis passe par
 * le même traitement (accès Premium, plan et devis, CRM, relances, statistiques).
 * Doc : https://docs.wajub.com/fr/payments/hosted-checkout
 */
const API = "https://api.wajub.com";

/** Cookie d'aperçu posé par ?paiement=wajub (ou ?paiement=chariow) sur la page de vente. */
export const PAY_COOKIE = "wp_pay";

export type WajubOffer = "catalogue" | "plan_devis";

export type WajubPayment = {
  id?: string;
  reference?: string | null;
  amount?: number;
  amount_paid?: number | null;
  currency?: string;
  status?: string;
  sandbox?: boolean;
  customer?: { id?: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  credited_at?: string | null;
};

export type WajubEvent = { id?: string; event?: string; livemode?: boolean; data?: WajubPayment | null };

export function wajubConfigured() {
  return Boolean(getEnv().WAJUB_SECRET_KEY);
}

/** Clé de test (sk_test.…) : paiements sandbox acceptés. Clé live : un paiement sandbox n'ouvre jamais d'accès. */
function sandboxKey() {
  return (getEnv().WAJUB_SECRET_KEY || "").startsWith("sk_test");
}

/**
 * Prestataire de paiement d'un achat : choix explicite (aperçu ?paiement=…, formulaire Wajub de la page de vente),
 * sinon la variable PAYMENT_PROVIDER. Wajub n'est utilisé que si sa clé secrète est configurée.
 */
export function paymentProvider(requested?: string | null): SaleProvider {
  const choice = requested === "wajub" || requested === "chariow" ? requested : getEnv().PAYMENT_PROVIDER;
  return choice === "wajub" && wajubConfigured() ? "wajub" : "chariow";
}

export function expectedAmount(offer: WajubOffer) {
  return offer === "plan_devis" ? projectStartPrice() : cataloguePrice();
}

async function wajubFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const { idempotencyKey, ...rest } = init;
  const response = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: getEnv().WAJUB_SECRET_KEY || "",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
  });
  const data = (await response.json().catch(() => null)) as {
    authorization_url?: string;
    transaction?: WajubPayment;
    message?: string;
  } | null;
  return { ok: response.ok, status: response.status, data };
}

/**
 * Crée le paiement Wajub d'une intention et renvoie la page de paiement. L'identifiant du paiement (trx_…)
 * est rangé dans l'intention (sale_id) pour confirmer le paiement au retour sur /merci.
 */
export async function createWajubCheckout(params: {
  offer: WajubOffer;
  intentId: string;
  description: string;
  customer: { name: string; email: string; phone: string | null };
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ url: string; paymentId: string } | { error: string }> {
  try {
    const { ok, status, data } = await wajubFetch("/payments", {
      method: "POST",
      // Un double clic ou une nouvelle tentative du navigateur renvoie le même paiement.
      idempotencyKey: `intent-${params.intentId}`,
      body: JSON.stringify({
        amount: expectedAmount(params.offer),
        currency: "XAF",
        customer: {
          name: params.customer.name.slice(0, 100),
          email: params.customer.email,
          ...(params.customer.phone ? { phone: params.customer.phone } : {}),
        },
        description: params.description,
        reference: params.intentId,
        callback: params.callbackUrl,
        // Page de paiement valable 2 h : au-delà, payment.expired relance le prospect comme un abandon Chariow.
        expires: { in: 120 },
        metadata: { intent_id: params.intentId, offer: params.offer, ...params.metadata },
      }),
    });
    const url = data?.authorization_url;
    const paymentId = data?.transaction?.id;
    if (ok && url && paymentId) {
      await getDb()
        .update(schema.checkoutIntents)
        .set({ saleId: paymentId, updatedAt: new Date() })
        .where(eq(schema.checkoutIntents.id, params.intentId));
      return { url, paymentId };
    }
    console.error("Wajub : création du paiement refusée", status, data?.message);
  } catch (error) {
    console.error("Wajub : création du paiement impossible", error);
  }
  return { error: "Le paiement n'a pas pu démarrer. Réessayez ou écrivez-nous sur WhatsApp." };
}

export async function retrieveWajubPayment(paymentId: string): Promise<WajubPayment | null> {
  const { ok, data } = await wajubFetch(`/payments/${encodeURIComponent(paymentId)}`);
  return ok ? (data?.transaction ?? null) : null;
}

const PAYMENT_EVENTS: Record<string, string> = {
  "payment.succeeded": "successful.sale",
  "payment.failed": "failed.sale",
  "payment.expired": "abandoned.sale",
  "payment.cancelled": "abandoned.sale",
};

/** Statut d'un paiement relu par l'API → événement de vente (null tant que le paiement n'est pas terminé). */
export function paymentStatusEvent(status: string | undefined) {
  return status ? (PAYMENT_EVENTS[`payment.${status}`] ?? null) : null;
}

/** Paiement Wajub → vente au format Chariow (produit Chariow équivalent, pour des statistiques communes). */
export function toSalePayload(payment: WajubPayment, saleEvent: string): ChariowSalePayload | null {
  const meta = Object.fromEntries(Object.entries(payment.metadata ?? {}).map(([k, v]) => [k, String(v ?? "")]));
  const offer = meta.offer as WajubOffer | undefined;
  const productId = offer === "plan_devis" ? planProductId() : offer === "catalogue" ? getEnv().CHARIOW_CATALOGUE_PRODUCT_ID : null;
  if (!payment.id || !productId) return null;
  const amount = Math.round(Number(payment.amount_paid || payment.amount || 0));
  return {
    event: saleEvent,
    sale: {
      id: payment.id,
      status: saleEvent === "successful.sale" ? "completed" : saleEvent.split(".")[0],
      amount: { value: amount, currency: payment.currency || "XAF" },
      custom_metadata: meta,
      created_at: payment.created_at ?? undefined,
      completed_at: payment.credited_at ?? null,
    },
    product: { id: productId, name: offer === "plan_devis" ? "Plan et devis" : "Catalogue Premium" },
    customer: {
      id: payment.customer?.id,
      name: payment.customer?.name ?? undefined,
      email: payment.customer?.email ?? undefined,
      phone: payment.customer?.phone ?? undefined,
      country: meta.country || null,
    },
  };
}

/**
 * Traite un paiement Wajub terminé (notification signée ou lecture par l'API). Idempotent, comme pour Chariow :
 * une vente n'ouvre l'accès (ou ne livre le plan) qu'une seule fois.
 */
export async function processWajubPayment(payment: WajubPayment, saleEvent: string): Promise<PulseOutcome> {
  if (payment.sandbox && !sandboxKey()) return "test_event";
  const payload = toSalePayload(payment, saleEvent);
  if (!payload) return "ignored_product";
  if (saleEvent === "successful.sale") {
    const expected = expectedAmount(payment.metadata?.offer === "plan_devis" ? "plan_devis" : "catalogue");
    if ((payload.sale?.amount?.value ?? 0) < expected || (payload.sale?.amount?.currency || "XAF") !== "XAF") {
      console.error("Wajub : montant inattendu, accès non ouvert", payment.id, payload.sale?.amount, expected);
      return "invalid_payload";
    }
  }
  return processSaleEvent(payload, "wajub");
}

/** Notification Wajub authentifiée : dédupliquée sur l'identifiant d'événement (evt_…). */
export async function handleWajubEvent(event: WajubEvent): Promise<PulseOutcome> {
  const saleEvent = PAYMENT_EVENTS[event.event || ""];
  if (!saleEvent) return "ignored_event";
  const payment = event.data;
  if (!event.id || !payment?.id) return "invalid_payload";
  return processDeliveryOnce(`wajub:${event.id}`, event.event!, payment.id, () => processWajubPayment(payment, saleEvent));
}
