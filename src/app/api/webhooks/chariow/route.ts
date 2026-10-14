import { serverEnv } from "@/lib/server-env";
import { verifyChariowSignature } from "@/lib/chariow-signature";
import { ensureD1Schema } from "@/lib/d1-schema";
import { NextResponse } from "next/server";
import {
  ensureFunnelSession,
  recordFunnelEvent,
  recordFunnelSale,
} from "@/lib/funnel-db";
import { buildFunnelAttribution } from "@/lib/funnel";
import { getPrisma } from "@/lib/prisma";

export const runtime = "edge";

const SUPPORTED_SALE_EVENTS = [
  "successful.sale",
  "abandoned.sale",
  "failed.sale",
] as const;

type SupportedSaleEvent = (typeof SUPPORTED_SALE_EVENTS)[number];

type ChariowWebhookPayload = {
  event?: string;
  sale?: {
    id?: string | null;
    status?: string | null;
    amount?: { value?: number | null; currency?: string | null } | null;
    original_amount?: {
      value?: number | null;
      currency?: string | null;
    } | null;
    payment?: { status?: string | null } | null;
    custom_metadata?: Record<string, string | undefined> | null;
  } | null;
  product?: { id?: string | null; name?: string | null } | null;
  customer?: {
    id?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    country?: string | null;
  } | null;
  license?: { key?: string | null } | null;
};

function parseBoolean(value: string | undefined | null) {
  return value === "true" || value === "1";
}

function isSupportedSaleEvent(
  event: string | undefined,
): event is SupportedSaleEvent {
  return SUPPORTED_SALE_EVENTS.includes(event as SupportedSaleEvent);
}

function eventToFunnelType(event: SupportedSaleEvent) {
  if (event === "successful.sale") return "checkout_completed";
  if (event === "abandoned.sale") return "checkout_abandoned";
  return "checkout_failed";
}

function defaultStatus(event: SupportedSaleEvent) {
  if (event === "successful.sale") return "completed";
  if (event === "abandoned.sale") return "abandoned";
  return "failed";
}

export async function POST(request: Request) {
  try {
    const secret = serverEnv("CHARIOW_PULSE_SECRET");
    const expectedProduct = serverEnv("CHARIOW_PRODUCT_ID");
    if (!secret || !expectedProduct)
      return NextResponse.json(
        { error: "Webhook non configuré" },
        { status: 503 },
      );
    const raw = new Uint8Array(await request.arrayBuffer());
    if (
      !(await verifyChariowSignature(
        raw,
        request.headers.get("x-chariow-signature"),
        secret,
      ))
    )
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 },
      );
    let payload: ChariowWebhookPayload;
    try {
      payload = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }
    if (payload.product?.id !== expectedProduct)
      return NextResponse.json({ received: true, ignored: true });
    const deliveryId = request.headers.get("x-pulse-delivery-id");
    if (!deliveryId)
      return NextResponse.json({
        received: true,
        test: true,
        activated: false,
      });
    if (!payload.sale?.id)
      return NextResponse.json({ error: "Vente manquante" }, { status: 400 });
    // Include the signed body digest: headers alone are not signed by Chariow.
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", raw)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const receiptId = `${deliveryId}:${digest}`;
    const bodyReceiptId = `body:${digest}`;
    await ensureD1Schema();
    const prisma = getPrisma();
    if (
      await prisma.webhookReceipt.findFirst({
        where: { id: { in: [receiptId, bodyReceiptId] } },
      })
    )
      return NextResponse.json({ received: true, duplicate: true });
    const event = payload.event;

    if (!isSupportedSaleEvent(event)) {
      return NextResponse.json({ received: true });
    }

    const customMetadata = payload.sale?.custom_metadata ?? {};
    const funnelSessionId = customMetadata.funnel_session_id?.trim() || "";
    const landingPath = customMetadata.landing_path?.trim() || "/";
    const searchParams = new URLSearchParams();
    if (parseBoolean(customMetadata.fbclid_present)) {
      searchParams.set("fbclid", "1");
    }
    if (customMetadata.utm_source)
      searchParams.set("utm_source", customMetadata.utm_source);
    if (customMetadata.utm_medium)
      searchParams.set("utm_medium", customMetadata.utm_medium);
    if (customMetadata.utm_campaign)
      searchParams.set("utm_campaign", customMetadata.utm_campaign);
    if (customMetadata.utm_content)
      searchParams.set("utm_content", customMetadata.utm_content);
    if (customMetadata.utm_term)
      searchParams.set("utm_term", customMetadata.utm_term);
    const attribution = buildFunnelAttribution({
      pathname: landingPath,
      searchParams,
      referrer: null,
    });
    const source =
      customMetadata.source === "facebook_ads"
        ? "facebook_ads"
        : attribution.source;

    if (funnelSessionId) {
      await ensureFunnelSession({
        sessionId: funnelSessionId,
        source,
        landingPath: landingPath || "/",
        referrer: null,
        utmSource: customMetadata.utm_source?.trim() || null,
        utmMedium: customMetadata.utm_medium?.trim() || null,
        utmCampaign: customMetadata.utm_campaign?.trim() || null,
        utmContent: customMetadata.utm_content?.trim() || null,
        utmTerm: customMetadata.utm_term?.trim() || null,
        fbclidPresent: parseBoolean(customMetadata.fbclid_present),
      });
    }

    const saleId = payload.sale?.id || null;
    const productId =
      payload.product?.id ||
      customMetadata.product_id?.trim() ||
      "unknown-product";
    const productName =
      payload.product?.name ||
      customMetadata.product_name?.trim() ||
      "WooPlans Premium";
    const amount =
      Math.round(
        Number(
          payload.sale?.amount?.value ??
            payload.sale?.original_amount?.value ??
            0,
        ),
      ) || 0;
    const currency =
      payload.sale?.amount?.currency ||
      payload.sale?.original_amount?.currency ||
      customMetadata.currency?.trim() ||
      "XAF";
    const status = defaultStatus(event);

    if (saleId) {
      await recordFunnelSale({
        sessionId: funnelSessionId || null,
        chariowSaleId: saleId,
        productId,
        productName,
        amount,
        currency,
        status,
      });
    }

    if (funnelSessionId) {
      await recordFunnelEvent({
        sessionId: funnelSessionId,
        id: `pulse:${payload.sale?.id}:${event}`,
        type: eventToFunnelType(event),
        path: landingPath || "/",
        ctaId: customMetadata.cta_id?.trim() || null,
        metadata: {
          chariow_sale_id: saleId || "",
          product_id: productId,
          product_name: productName,
          amount,
          currency,
          status,
          source,
          customer_email: payload.customer?.email || "",
          customer_first_name: payload.customer?.first_name || "",
          customer_last_name: payload.customer?.last_name || "",
          customer_phone: payload.customer?.phone || "",
          customer_country: payload.customer?.country || "",
          pulse_event: event,
        },
      });
    }

    if (event !== "successful.sale") {
      console.log(
        `Chariow ${event} recorded for relance (Sale: ${saleId || "unknown"})`,
      );
      await prisma.webhookReceipt.upsert({
        where: { id: bodyReceiptId },
        update: {},
        create: { id: bodyReceiptId },
      });
      await prisma.webhookReceipt.upsert({
        where: { id: receiptId },
        update: {},
        create: { id: receiptId },
      });
      return NextResponse.json({
        received: true,
        recorded: true,
        activated: false,
      });
    }

    const { customer } = payload;

    if (!customer?.email) {
      console.error("No customer email in successful sale webhook payload");
      await prisma.webhookReceipt.upsert({
        where: { id: bodyReceiptId },
        update: {},
        create: { id: bodyReceiptId },
      });
      await prisma.webhookReceipt.upsert({
        where: { id: receiptId },
        update: {},
        create: { id: receiptId },
      });
      return NextResponse.json({
        received: true,
        recorded: true,
        activated: false,
      });
    }

    const email = customer.email.trim().toLowerCase();
    // Preserve credentials on retries; only create a code for a new member.
    const premiumCode =
      payload.license?.key || crypto.randomUUID().replace(/-/g, "");
    await prisma.subscriber.upsert({
      where: { email },
      update: {
        isActive: true,
        expiresAt: null,
        chariowCustomerId: customer.id || null,
        chariowLicenseKey: payload.license?.key || null,
      },
      create: {
        email,
        isActive: true,
        expiresAt: null,
        chariowCustomerId: customer.id || null,
        chariowLicenseKey: payload.license?.key || null,
        premiumCode,
      },
    });
    await prisma.webhookReceipt.upsert({
      where: { id: bodyReceiptId },
      update: {},
      create: { id: bodyReceiptId },
    });
    await prisma.webhookReceipt.upsert({
      where: { id: receiptId },
      update: {},
      create: { id: receiptId },
    });

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    console.error("Chariow webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ method: "POST" });
}
