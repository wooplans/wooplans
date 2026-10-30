import { normalizePhone, phoneCountry, type ChariowPhone } from "@/lib/phone";
import { and, desc, eq, gte, isNotNull, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { accessCodeEmail, adminSaleEmail, planDevisEmail, sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { grantAccess, normalizeEmail } from "@/lib/members";
import { recordServerEvent } from "@/lib/tracking";
import { FUNNEL_EVENTS, countryRequiresConsent, variantFromCta } from "@/lib/behavior";
import { captureServerEvents } from "@/lib/posthog";
import { recordProspectEvent } from "@/lib/prospects";
import { schedulePlanRelance } from "@/lib/plan-relance";

function customerCountry(customer: { phone?: ChariowPhone; country?: string | { code?: string } | null }) {
  const c = customer.country;
  return (typeof c === "string" ? c : c?.code) || phoneCountry(customer.phone) || null;
}

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
    phone?: ChariowPhone;
    country?: string | { code?: string } | null;
  } | null;
};

const SALE_EVENTS: Record<string, "completed" | "abandoned" | "failed"> = {
  "successful.sale": "completed",
  "abandoned.sale": "abandoned",
  "failed.sale": "failed",
};

export { verifyChariowSignature } from "@/lib/chariow-signature";

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
  | "already_granted"
  | "plan_delivered"
  | "plan_unmatched";

/**
 * Traite une notification déjà authentifiée. Idempotent :
 * - déduplication sur x-pulse-delivery-id ;
 * - une même vente ne crée l'accès qu'une seule fois, même reçue par plusieurs Pulses.
 */
export async function handleChariowPulse(payload: ChariowSalePayload, deliveryId: string | null): Promise<PulseOutcome> {
  const event = payload.event || "";

  if (!deliveryId) {
    // Événement de test envoyé depuis le tableau de bord Chariow : jamais d'activation.
    return "test_event";
  }

  return processDeliveryOnce(deliveryId, event, payload.sale?.id ?? null, () => processSaleEvent(payload));
}

/**
 * Journalise une notification (Chariow ou Wajub) puis la traite une seule fois : une notification
 * déjà reçue renvoie « duplicate ». En cas d'erreur, la clé est libérée pour que la nouvelle tentative soit retraitée.
 */
export async function processDeliveryOnce(
  deliveryId: string,
  event: string,
  saleId: string | null,
  run: () => Promise<PulseOutcome>,
): Promise<PulseOutcome> {
  const db = getDb();
  const inserted = await db
    .insert(schema.webhookDeliveries)
    .values({ deliveryId, event, saleId, outcome: "processing" })
    .onConflictDoNothing()
    .returning({ id: schema.webhookDeliveries.deliveryId });
  if (inserted.length === 0) return "duplicate";

  const outcome = await run().catch(async (error) => {
    await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.deliveryId, deliveryId));
    throw error;
  });

  await db
    .update(schema.webhookDeliveries)
    .set({ outcome })
    .where(eq(schema.webhookDeliveries.deliveryId, deliveryId));
  return outcome;
}

/** Prestataire qui a encaissé la vente (les ventes Wajub passent par le même traitement que Chariow). */
export type SaleProvider = "chariow" | "wajub";
const PROVIDER_LABEL: Record<SaleProvider, string> = { chariow: "Chariow", wajub: "Wajub" };

/**
 * Enregistre une vente (catalogue ou plan et devis) et, sur paiement confirmé, ouvre l'accès ou livre le plan.
 * Appelé avec une notification Chariow, ou une notification Wajub mise au même format (src/lib/wajub.ts).
 */
export async function processSaleEvent(payload: ChariowSalePayload, provider: SaleProvider = "chariow"): Promise<PulseOutcome> {
  const db = getDb();
  const status = SALE_EVENTS[payload.event || ""];
  if (!status) return "ignored_event";

  const sale = payload.sale;
  const productId = payload.product?.id;
  if (!sale?.id || !productId) return "invalid_payload";
  if (planProductId() && productId === planProductId()) return processPlanSale(payload, status, provider);
  if (!catalogueProductIds().has(productId)) return "ignored_product";

  const customer = payload.customer ?? {};
  const email = customer.email ? normalizeEmail(customer.email) : null;
  const name = customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null;
  const amount = Math.round(Number(sale.amount?.value ?? sale.original_amount?.value ?? 0)) || 0;
  const currency = sale.amount?.currency || sale.original_amount?.currency || "XAF";
  const metadata = sale.custom_metadata ?? {};

  const matched = await findIntent(metadata.intent_id, email);
  // Widget Snap : aucune donnée ne relie la vente au navigateur. On rattache, pour les
  // statistiques uniquement, le dernier clic « acheter » non attribué (jamais pour afficher un code).
  const attributionOnly = matched ? null : await findRecentAnonymousIntent();
  const intent = matched ?? attributionOnly;
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
    phone: normalizePhone(customer.phone),
    country: customerCountry(customer),
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
    // CRM prospects : paiement abandonné ou échoué → séquence de relance (sauf si la vente est déjà payée).
    if (email && nextStatus !== "completed") {
      await recordProspectEvent({
        email,
        name,
        phone: values.phone,
        country: values.country,
        event: status,
        occurredAt: values.occurredAt,
        saleId: sale.id,
        amount,
        source: "webhook",
        utmSource: values.utmSource,
        utmCampaign: values.utmCampaign,
        startSequence: true,
      }).catch((error) => console.error("CRM prospects : enregistrement impossible", error));
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
      phone: normalizePhone(customer.phone),
      country: customerCountry(customer),
      source: provider,
      chariowCustomerId: provider === "chariow" ? customer.id : null,
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
        email,
        revealCode: attributionOnly ? null : code,
        revealUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(schema.checkoutIntents.id, intent.id));
  }
  if (visitor) {
    await recordServerEvent({ visitorId: visitor.id, type: "purchase", path: "/merci", ctaId: intent?.ctaId ?? null });
    // PostHog : hors Europe seulement (le consentement n'est pas connu ici). Aucune donnée personnelle :
    // identifiant anonyme du visiteur. Les ventes du widget, rattachées au dernier clic « acheter »,
    // sont envoyées avec match = probable pour que le tunnel PostHog aille jusqu'à l'achat.
    if (!countryRequiresConsent(visitor.country)) {
      captureServerEvents([
        {
          event: FUNNEL_EVENTS.purchase,
          distinctId: visitor.id,
          properties: {
            amount,
            currency,
            cta_id: intent?.ctaId ?? null,
            variant: variantFromCta(intent?.ctaId),
            page_type: "page_vente",
            match: matched ? "certain" : "probable",
            wp_source: visitor.source,
            wp_campaign: visitor.utmCampaign,
          },
        },
      ]);
    }
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

/* ─────────────── Plan et devis d'un modèle ─────────────── */

export function planProductId() {
  return getEnv().CHARIOW_PLAN_PRODUCT_ID || "";
}

/** Prix déduit des plans complets, inscrit dans le CRM avec l'achat. */
const PLAN_CREDIT_NOTE = "Plan et devis payé : son prix est déduit des plans complets de ce modèle.";

/**
 * Vente du produit « Plan et devis » (un seul modèle). Le modèle vient de l'intention créée
 * avant le paiement (métadonnée intent_id, ou à défaut le même email dans les 48 h).
 * Sur paiement confirmé : lien de téléchargement par email, fiche dans le CRM, alerte au propriétaire.
 */
async function processPlanSale(
  payload: ChariowSalePayload,
  status: "completed" | "abandoned" | "failed",
  provider: SaleProvider,
): Promise<PulseOutcome> {
  const db = getDb();
  const saleLabel = `Vente ${PROVIDER_LABEL[provider]}`;
  const sale = payload.sale!;
  const customer = payload.customer ?? {};
  const email = customer.email ? normalizeEmail(customer.email) : null;
  const name = customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null;
  const phone = normalizePhone(customer.phone);
  const country = customerCountry(customer);
  const amount = Math.round(Number(sale.amount?.value ?? sale.original_amount?.value ?? 0)) || 0;
  const metadata = sale.custom_metadata ?? {};

  const intent = await findPlanIntent(metadata.intent_id, email);
  const visitor = intent?.visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, intent.visitorId) }) : null;
  const existing = await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, sale.id!) });
  const nextStatus = existing?.status === "completed" ? "completed" : status;
  const values = {
    productId: payload.product!.id!,
    productName: `Plan et devis${intent?.planSlug ? ` · ${intent.planSlug}` : ""}`,
    status: nextStatus,
    amount,
    currency: sale.amount?.currency || sale.original_amount?.currency || "XAF",
    email,
    name,
    phone,
    country,
    intentId: intent?.id ?? existing?.intentId ?? null,
    visitorId: visitor?.id ?? existing?.visitorId ?? null,
    utmSource: visitor?.utmSource ?? existing?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? existing?.utmCampaign ?? null,
    source: visitor?.source ?? existing?.source ?? null,
    occurredAt: new Date(sale.completed_at || sale.created_at || Date.now()),
    updatedAt: new Date(),
  } as const;
  if (existing) await db.update(schema.sales).set(values).where(eq(schema.sales.id, existing.id));
  else await db.insert(schema.sales).values({ id: randomId(), chariowSaleId: sale.id!, ...values });

  if (status !== "completed" || (sale.status && sale.status !== "completed")) {
    if (intent && intent.status === "started" && status !== "completed") {
      await db
        .update(schema.checkoutIntents)
        .set({ status, saleId: sale.id, updatedAt: new Date() })
        .where(eq(schema.checkoutIntents.id, intent.id));
    }
    // Relance courte par email (2 emails), sauf si la vente est déjà payée.
    const to = email ?? intent?.email;
    if (intent && to && status !== "completed" && nextStatus !== "completed") {
      await schedulePlanRelance(intent.id, to, values.occurredAt).catch((error) => console.error("Relance plan et devis : programmation impossible", error));
    }
    return "recorded";
  }

  const notify = getEnv().ADMIN_NOTIFY_EMAIL;
  const plan = intent?.planSlug ? await db.query.plans.findFirst({ where: eq(schema.plans.slug, intent.planSlug) }) : null;
  if (!intent || !plan) {
    // Modèle inconnu (email différent de celui saisi sur le site) : livraison manuelle par le propriétaire.
    if (notify) {
      const subject = `Plan et devis payé, modèle à identifier : ${name || email || "client"}`;
      await sendEmail({
        to: notify,
        subject,
        template: "admin_sale",
        text: `${subject}
Email : ${email || "—"}
Téléphone : ${phone || "—"}
${saleLabel} : ${sale.id}
Contactez le client pour savoir quel modèle lui envoyer.`,
        html: `<p><strong>${subject}</strong></p><p>Email : ${email || "—"}<br>Téléphone : ${phone || "—"}<br>${saleLabel} : ${sale.id}</p><p>Contactez le client pour savoir quel modèle lui envoyer.</p>`,
      });
    }
    return "plan_unmatched";
  }

  // Verrou : une seule notification livre ce plan (Pulses multiples ou rejouées).
  const claimed = await db
    .update(schema.checkoutIntents)
    .set({ status: "paid", saleId: sale.id, email: email ?? intent.email, updatedAt: new Date() })
    .where(and(eq(schema.checkoutIntents.id, intent.id), ne(schema.checkoutIntents.status, "paid")))
    .returning({ id: schema.checkoutIntents.id });
  if (claimed.length === 0) return "already_granted";

  const to = email ?? intent.email;
  const downloadUrl = siteUrl(`/api/plan-devis/${intent.id}`);
  if (to) {
    const mail = planDevisEmail({ name, planName: plan.name, planCode: plan.code, downloadUrl });
    await sendEmail({ to, ...mail, template: "plan_devis" });
  }

  const leadId = randomId();
  await db.insert(schema.leads).values({
    id: leadId,
    name: name || to || "Client",
    phone,
    email: to,
    country,
    planId: plan.id,
    planLabel: plan.code,
    channel: "site",
    stage: "demande",
    projectDetails: PLAN_CREDIT_NOTE,
    catalogueCredit: amount,
    nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    utmSource: visitor?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? null,
  });
  await db.insert(schema.leadActivities).values({
    id: randomId(),
    leadId,
    kind: "payment",
    body: `Plan et devis du modèle ${plan.code} payé (${amount.toLocaleString("fr-FR")} FCFA, ${saleLabel.toLowerCase()} ${sale.id}). Lien de téléchargement envoyé par email.`,
    author: "site",
  });

  if (visitor) await recordServerEvent({ visitorId: visitor.id, type: "purchase", path: "/merci", ctaId: intent.ctaId ?? null });
  if (notify) {
    const adminMail = adminSaleEmail({ email: to || "—", name, amount, product: `Plan et devis ${plan.code}` });
    await sendEmail({ to: notify, ...adminMail, template: "admin_sale", leadId });
  }
  return "plan_delivered";
}

async function findPlanIntent(intentId: string | undefined, email: string | null) {
  const db = getDb();
  if (intentId) {
    const byId = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, intentId) });
    if (byId?.planSlug) return byId;
  }
  if (!email) return null;
  return (
    (await db.query.checkoutIntents.findFirst({
      where: and(
        eq(schema.checkoutIntents.email, email),
        isNotNull(schema.checkoutIntents.planSlug),
        ne(schema.checkoutIntents.status, "paid"),
        gte(schema.checkoutIntents.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
      ),
      orderBy: desc(schema.checkoutIntents.createdAt),
    })) ?? null
  );
}

async function findRecentAnonymousIntent() {
  return (
    (await getDb().query.checkoutIntents.findFirst({
      where: and(
        isNull(schema.checkoutIntents.email),
        eq(schema.checkoutIntents.status, "started"),
        gte(schema.checkoutIntents.createdAt, new Date(Date.now() - 2 * 60 * 60 * 1000)),
      ),
      orderBy: desc(schema.checkoutIntents.createdAt),
    })) ?? null
  );
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
        isNull(schema.checkoutIntents.planSlug),
        gte(schema.checkoutIntents.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
      ),
      orderBy: desc(schema.checkoutIntents.createdAt),
    })) ?? null
  );
}

/* ─────────────── Paiement ─────────────── */

export function storefrontCheckoutUrl(productId?: string) {
  const env = getEnv();
  return `https://${env.CHARIOW_STORE_DOMAIN}/${productId || env.CHARIOW_CATALOGUE_PRODUCT_ID}/checkout`;
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
  /** Produit à payer (par défaut le Catalogue Premium). */
  productId?: string;
  /** Code promo Chariow : en cas de refus, aucun repli vers la boutique (le client paierait plein tarif). */
  discountCode?: string;
}): Promise<{ url: string; mode: "api" | "storefront" } | { error: string }> {
  const env = getEnv();
  const productId = params.productId || env.CHARIOW_CATALOGUE_PRODUCT_ID;
  if (!env.CHARIOW_API_KEY) return { url: storefrontCheckoutUrl(productId), mode: "storefront" };

  try {
    const response = await fetch("https://api.chariow.com/v1/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CHARIOW_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        email: params.customer.email,
        first_name: params.customer.firstName.slice(0, 50),
        last_name: (params.customer.lastName || params.customer.firstName).slice(0, 50),
        phone: { number: params.customer.phoneNumber, country_code: params.customer.countryCode },
        redirect_url: params.redirectUrl,
        customer_ip: params.customerIp,
        custom_metadata: { intent_id: params.intentId, ...params.metadata },
        ...(params.discountCode ? { discount_code: params.discountCode } : {}),
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      data?: { step?: string; payment?: { checkout_url?: string | null } };
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const url = data?.data?.payment?.checkout_url;
    if (response.ok && data?.data?.step === "payment" && url) return { url, mode: "api" };
    // Code promo à 100 % : la vente est conclue sans paiement, la notification Chariow suit.
    if (response.ok && data?.data?.step === "completed") return { url: params.redirectUrl, mode: "api" };
    if (params.discountCode && !response.ok) {
      const discountError = data?.errors?.discount_code?.[0] || (/discount|code/i.test(data?.message || "") ? data?.message : null);
      return { error: discountError ? "Ce code promo n'est pas valable pour cet achat." : "Le paiement n'a pas pu démarrer. Réessayez ou écrivez-nous sur WhatsApp." };
    }
    console.warn("Chariow checkout API indisponible, repli boutique :", response.status, data?.message);
  } catch (error) {
    console.warn("Chariow checkout API erreur, repli boutique :", error);
  }
  return { url: storefrontCheckoutUrl(productId), mode: "storefront" };
}
