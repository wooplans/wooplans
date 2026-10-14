import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hmacSha256Hex, randomId, timingSafeEqual } from "@/lib/crypto";
import { accessCodeEmail, adminSaleEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { grantAccess, normalizeEmail } from "@/lib/members";
import { recordServerEvent } from "@/lib/tracking";

export type ChariowSalePayload = {
  event?: string;
  note?: string;
  sale?: {
    id?: string;
    status?: string;
    amount?: { value?: number; currency?: string } | null;
    original_amount?: { value?: number; currency?: string } | null;
    custom_metadata?: Record<string, string> | null;
    created_at?: string;
    completed_at?: string | null;
  } | null;
  product?: { id?: string; name?: string } | null;
  customer?: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    country?: string;
  } | null;
};

const SALE_EVENTS: Record<string, "completed" | "abandoned" | "failed"> = {
  "successful.sale": "completed",
  "abandoned.sale": "abandoned",
  "failed.sale": "failed",
};

/** HMAC-SHA256 du corps brut, comparé en temps constant (contrat « Pulse Security » de Chariow). */
export async function verifyChariowSignature(rawBody: Uint8Array, header: string | null, secret: string) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = `sha256=${await hmacSha256Hex(secret, rawBody)}`;
  return timingSafeEqual(header, expected);
}

export function catalogueProductIds() {
  const env = getEnv();
  return new Set(
    [env.CHARIOW_CATALOGUE_PRODUCT_ID, ...(env.CHARIOW_LEGACY_CATALOGUE_PRODUCT_IDS || "").split(",")]
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export type PulseOutcome =
  | "duplicate"
  | "test_event"
  | "ignored_event"
  | "ignored_product"
  | "invalid_payload"
  | "recorded"
  | "access_granted"
  | "already_granted";

/**
 * Traite une notification déjà authentifiée. Idempotent :
 * - déduplication sur x-pulse-delivery-id ;
 * - une même vente ne crée l'accès qu'une seule fois, même reçue par plusieurs Pulses.
 */
export async function handleChariowPulse(payload: ChariowSalePayload, deliveryId: string | null): Promise<PulseOutcome> {
  const db = getDb();
  const event = payload.event || "";

  if (!deliveryId) {
    // Événement de test envoyé depuis le tableau de bord Chariow : jamais d'activation.
    return "test_event";
  }

  const inserted = await db
    .insert(schema.webhookDeliveries)
    .values({ deliveryId, event, saleId: payload.sale?.id ?? null, outcome: "processing" })
    .onConflictDoNothing()
    .returning({ id: schema.webhookDeliveries.deliveryId });
  if (inserted.length === 0) return "duplicate";

  const outcome = await processSaleEvent(payload).catch(async (error) => {
    // Libère la clé pour que la nouvelle tentative de Chariow soit retraitée.
    await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.deliveryId, deliveryId));
    throw error;
  });

  await db
    .update(schema.webhookDeliveries)
    .set({ outcome })
    .where(eq(schema.webhookDeliveries.deliveryId, deliveryId));
  return outcome;
}

async function processSaleEvent(payload: ChariowSalePayload): Promise<PulseOutcome> {
  const db = getDb();
  const status = SALE_EVENTS[payload.event || ""];
  if (!status) return "ignored_event";

  const sale = payload.sale;
  const productId = payload.product?.id;
  if (!sale?.id || !productId) return "invalid_payload";
  if (!catalogueProductIds().has(productId)) return "ignored_product";

  const customer = payload.customer ?? {};
  const email = customer.email ? normalizeEmail(customer.email) : null;
  const name = customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null;
  const amount = Math.round(Number(sale.amount?.value ?? sale.original_amount?.value ?? 0)) || 0;
  const currency = sale.amount?.currency || sale.original_amount?.currency || "XAF";
  const metadata = sale.custom_metadata ?? {};

  const intent = await findIntent(metadata.intent_id, email);
  const visitor = intent?.visitorId
    ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, intent.visitorId) })
    : null;

  const existing = await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, sale.id) });
  // Une vente confirmée ne redescend jamais à « abandonnée » ou « échouée » (notifications hors ordre).
  const nextStatus = existing?.status === "completed" ? "completed" : status;
  const values = {
    productId,
    productName: payload.product?.name || "Catalogue Premium",
    status: nextStatus,
    amount,
    currency,
    email,
    name,
    phone: customer.phone || null,
    country: customer.country || null,
    intentId: intent?.id ?? existing?.intentId ?? null,
    visitorId: visitor?.id ?? existing?.visitorId ?? null,
    utmSource: visitor?.utmSource ?? existing?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? existing?.utmCampaign ?? null,
    source: visitor?.source ?? existing?.source ?? null,
    occurredAt: new Date(sale.completed_at || sale.created_at || Date.now()),
    updatedAt: new Date(),
  } as const;

  const [saleRow] = existing
    ? await db.update(schema.sales).set(values).where(eq(schema.sales.id, existing.id)).returning()
    : await db
        .insert(schema.sales)
        .values({ id: randomId(), chariowSaleId: sale.id, ...values })
        .returning();

  if (status !== "completed") {
    if (intent && intent.status === "started") {
      await db
        .update(schema.checkoutIntents)
        .set({ status, saleId: sale.id, updatedAt: new Date() })
        .where(eq(schema.checkoutIntents.id, intent.id));
    }
    return "recorded";
  }

  // Accès activé uniquement sur paiement confirmé.
  if (sale.status && sale.status !== "completed") return "recorded";
  if (!email) return "invalid_payload";
  // Verrou : une seule notification peut « réclamer » l'activation de cette vente.
  const claimed = await db
    .update(schema.sales)
    .set({ memberId: "pending" })
    .where(and(eq(schema.sales.id, saleRow.id), isNull(schema.sales.memberId)))
    .returning({ id: schema.sales.id });
  if (claimed.length === 0) return "already_granted";

  let granted: Awaited<ReturnType<typeof grantAccess>>;
  try {
    granted = await grantAccess({
      email,
      name,
      phone: customer.phone,
      country: customer.country,
      source: "chariow",
      chariowCustomerId: customer.id,
    });
  } catch (error) {
    await db.update(schema.sales).set({ memberId: null }).where(eq(schema.sales.id, saleRow.id));
    throw error;
  }
  const { member, code } = granted;

  await db.update(schema.sales).set({ memberId: member.id }).where(eq(schema.sales.id, saleRow.id));

  if (intent) {
    await db
      .update(schema.checkoutIntents)
      .set({
        status: "paid",
        saleId: sale.id,
        revealCode: code,
        revealUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(schema.checkoutIntents.id, intent.id));
  }
  if (visitor) {
    await recordServerEvent({ visitorId: visitor.id, type: "purchase", path: "/merci", ctaId: intent?.ctaId ?? null });
  }

  const mail = accessCodeEmail({ name, email, code });
  await sendEmail({ to: email, ...mail, template: "access_code", memberId: member.id });

  const notify = getEnv().ADMIN_NOTIFY_EMAIL;
  if (notify) {
    const adminMail = adminSaleEmail({ email, name, amount, product: values.productName });
    await sendEmail({ to: notify, ...adminMail, template: "admin_sale" });
  }

  return "access_granted";
}

async function findIntent(intentId: string | undefined, email: string | null) {
  const db = getDb();
  if (intentId) {
    const byId = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) });
    if (byId) return byId;
  }
  if (!email) return null;
  // Repli : intention la plus récente du même email dans les 48 dernières heures.
  return (
    (await db.query.checkoutIntents.findFirst({
      where: and(
        eq(schema.checkoutIntents.email, email),
        gte(schema.checkoutIntents.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
      ),
      orderBy: desc(schema.checkoutIntents.createdAt),
    })) ?? null
  );
}

/* ─────────────── Paiement ─────────────── */

export function storefrontCheckoutUrl() {
  const env = getEnv();
  return `https://${env.CHARIOW_STORE_DOMAIN}/${env.CHARIOW_CATALOGUE_PRODUCT_ID}/checkout`;
}

type CheckoutCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
};

/**
 * Tente une session de paiement via l'API Chariow (redirection + métadonnées).
 * Les produits de type « service » ne sont pas acceptés par l'API : on retombe alors
 * sur la page de paiement Chariow, et la vente est rattachée par l'email.
 */
export async function createChariowCheckout(params: {
  customer: CheckoutCustomer;
  intentId: string;
  redirectUrl: string;
  metadata: Record<string, string>;
  customerIp?: string;
}): Promise<{ url: string; mode: "api" | "storefront" }> {
  const env = getEnv();
  if (!env.CHARIOW_API_KEY) return { url: storefrontCheckoutUrl(), mode: "storefront" };

  try {
    const response = await fetch("https://api.chariow.com/v1/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CHARIOW_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: env.CHARIOW_CATALOGUE_PRODUCT_ID,
        email: params.customer.email,
        first_name: params.customer.firstName.slice(0, 50),
        last_name: (params.customer.lastName || params.customer.firstName).slice(0, 50),
        phone: { number: params.customer.phoneNumber, country_code: params.customer.countryCode },
        redirect_url: params.redirectUrl,
        customer_ip: params.customerIp,
        custom_metadata: { intent_id: params.intentId, ...params.metadata },
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      data?: { step?: string; payment?: { checkout_url?: string | null } };
      message?: string;
    } | null;
    const url = data?.data?.payment?.checkout_url;
    if (response.ok && data?.data?.step === "payment" && url) return { url, mode: "api" };
    console.warn("Chariow checkout API indisponible, repli boutique :", response.status, data?.message);
  } catch (error) {
    console.warn("Chariow checkout API erreur, repli boutique :", error);
  }
  return { url: storefrontCheckoutUrl(), mode: "storefront" };
}
