import { NextResponse } from "next/server";
import { ensureFunnelSession, recordFunnelEvent, recordFunnelSale } from "@/lib/funnel-db";
import { buildFunnelAttribution } from "@/lib/funnel";
import { getPrisma } from "@/lib/prisma";

export const runtime = "edge";

type ChariowWebhookPayload = {
  event?: string;
  sale?: {
    id?: string | null;
    status?: string | null;
    amount?: { value?: number | null; currency?: string | null } | null;
    original_amount?: { value?: number | null; currency?: string | null } | null;
    payment?: { status?: string | null } | null;
    custom_metadata?: Record<string, string | undefined> | null;
  } | null;
  product?: { id?: string | null; name?: string | null } | null;
  customer?: {
    id?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  license?: { key?: string | null } | null;
};

function parseBoolean(value: string | undefined | null) {
  return value === "true" || value === "1";
}

export async function POST(request: Request) {
  try {
    const prisma = getPrisma();
    const payload = (await request.json()) as ChariowWebhookPayload;
    const event = payload.event;

    if (event !== "successful.sale") {
      return NextResponse.json({ received: true });
    }

    const { customer } = payload;

    if (!customer?.email) {
      console.error("No customer email in webhook payload");
      return NextResponse.json({ received: true });
    }

    const customMetadata = payload.sale?.custom_metadata ?? {};
    const funnelSessionId = customMetadata.funnel_session_id?.trim() || "";
    const landingPath = customMetadata.landing_path?.trim() || "/";
    const searchParams = new URLSearchParams();
    if (parseBoolean(customMetadata.fbclid_present)) {
      searchParams.set("fbclid", "1");
    }
    if (customMetadata.utm_source) searchParams.set("utm_source", customMetadata.utm_source);
    if (customMetadata.utm_medium) searchParams.set("utm_medium", customMetadata.utm_medium);
    if (customMetadata.utm_campaign) searchParams.set("utm_campaign", customMetadata.utm_campaign);
    if (customMetadata.utm_content) searchParams.set("utm_content", customMetadata.utm_content);
    if (customMetadata.utm_term) searchParams.set("utm_term", customMetadata.utm_term);
    const attribution = buildFunnelAttribution({
      pathname: landingPath,
      searchParams,
      referrer: null,
    });
    const source =
      customMetadata.source === "facebook_ads" ? "facebook_ads" : attribution.source;

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
    const productId = payload.product?.id || customMetadata.product_id?.trim() || "unknown-product";
    const productName = payload.product?.name || customMetadata.product_name?.trim() || "WooPlans Premium";
    const amount =
      Math.round(Number(payload.sale?.amount?.value ?? payload.sale?.original_amount?.value ?? 0)) ||
      0;
    const currency =
      payload.sale?.amount?.currency ||
      payload.sale?.original_amount?.currency ||
      customMetadata.currency?.trim() ||
      "XAF";
    const status = payload.sale?.status || payload.sale?.payment?.status || "completed";

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

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: customer.email },
    });

    const premiumCode = String(Math.floor(1000 + Math.random() * 9000));
    const chariowSaleId = saleId;
    const chariowLicenseKey = payload.license?.key || null;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    if (subscriber) {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          isActive: true,
          expiresAt,
          chariowCustomerId: chariowSaleId,
          chariowLicenseKey,
          premiumCode,
        },
      });
    } else {
      await prisma.subscriber.create({
        data: {
          email: customer.email,
          isActive: true,
          expiresAt,
          chariowCustomerId: chariowSaleId,
          chariowLicenseKey,
          premiumCode,
        },
      });
    }

    if (funnelSessionId) {
      await recordFunnelEvent({
        sessionId: funnelSessionId,
        type: "checkout_completed",
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
        },
      });
    }

    console.log(
      `Subscriber ${customer.email} activated with premium code (Sale: ${chariowSaleId})`,
    );

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    console.error("Chariow webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ method: "POST" });
}
