import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { ensureFunnelSession, recordFunnelEvent } from "@/lib/funnel-db";
import { buildFunnelAttribution } from "@/lib/funnel";

export const runtime = "edge";

type CheckoutStartBody = {
  session_id?: string;
  source?: string;
  landing_path?: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid_present?: boolean;
  cta_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  country_code?: string;
  discount_code?: string;
  path?: string;
};

type CloudflareEnv = {
  CHARIOW_API_KEY?: string;
  CHARIOW_PRODUCT_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  SITE_URL?: string;
};

const DEFAULT_CHARIOW_PRODUCT_ID = "prd_41k85hc0";
const DEFAULT_PUBLIC_SITE_URL = "https://wooplans.com";

function parsePath(value: string | undefined, fallback = "/") {
  const input = value && value.trim() ? value.trim() : fallback;
  try {
    const url = new URL(input, "https://wooplans.local");
    return {
      pathname: url.pathname || fallback,
      searchParams: url.searchParams,
      path: `${url.pathname || fallback}${url.search}`,
    };
  } catch {
    return {
      pathname: fallback,
      searchParams: new URLSearchParams(),
      path: fallback,
    };
  }
}

function getEnv() {
  const context = getOptionalRequestContext();
  const env = context?.env as CloudflareEnv | undefined;
  return {
    apiKey: env?.CHARIOW_API_KEY || process.env.CHARIOW_API_KEY || "",
    productId: env?.CHARIOW_PRODUCT_ID || process.env.CHARIOW_PRODUCT_ID || DEFAULT_CHARIOW_PRODUCT_ID,
    siteUrl: env?.SITE_URL || process.env.SITE_URL || env?.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
  };
}

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);
}

function getPublicSiteUrl(request: Request, configuredSiteUrl: string) {
  if (configuredSiteUrl.trim()) {
    return configuredSiteUrl.trim().replace(/\/+$/, "");
  }

  const requestOrigin = new URL(request.url).origin;
  if (!isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizeCountryCode(value: string) {
  return value.trim().toUpperCase().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutStartBody;
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
    const lastName = typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phoneNumber = typeof body.phone_number === "string" ? normalizePhone(body.phone_number) : "";
    const countryCode = typeof body.country_code === "string" ? normalizeCountryCode(body.country_code) : "";
    const discountCode = typeof body.discount_code === "string" ? body.discount_code.trim().slice(0, 100) : "";
    const landing = parsePath(body.landing_path);
    const current = parsePath(body.path, landing.path);
    const searchParams = new URLSearchParams();
    if (body.fbclid_present) {
      searchParams.set("fbclid", "1");
    }
    if (body.utm_source) searchParams.set("utm_source", body.utm_source);
    if (body.utm_medium) searchParams.set("utm_medium", body.utm_medium);
    if (body.utm_campaign) searchParams.set("utm_campaign", body.utm_campaign);
    if (body.utm_content) searchParams.set("utm_content", body.utm_content);
    if (body.utm_term) searchParams.set("utm_term", body.utm_term);

    if (!sessionId) {
      return NextResponse.json({ error: "session_id manquant" }, { status: 400 });
    }

    if (!firstName || firstName.length > 50) {
      return NextResponse.json({ error: "Le prenom est requis" }, { status: 400 });
    }

    if (!lastName || lastName.length > 50) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    if (!phoneNumber || phoneNumber.length < 6) {
      return NextResponse.json({ error: "Telephone invalide" }, { status: 400 });
    }

    if (!countryCode) {
      return NextResponse.json({ error: "Pays invalide" }, { status: 400 });
    }

    const { apiKey, productId, siteUrl } = getEnv();
    if (!apiKey || !productId) {
      return NextResponse.json(
        { error: "La configuration Chariow est incomplète" },
        { status: 500 },
      );
    }

    const attribution = buildFunnelAttribution({
      pathname: landing.pathname,
      searchParams,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
    });

    try {
      await ensureFunnelSession({
        sessionId,
        ...attribution,
      });
    } catch (error) {
      console.error("Failed to persist funnel session before checkout:", error);
    }

    const checkoutMetadata = {
      funnel_session_id: sessionId,
      source: attribution.source,
      landing_path: attribution.landingPath,
      cta_id: typeof body.cta_id === "string" && body.cta_id.trim() ? body.cta_id.trim() : "",
      utm_source: attribution.utmSource || "",
      utm_medium: attribution.utmMedium || "",
      utm_campaign: attribution.utmCampaign || "",
      utm_content: attribution.utmContent || "",
      utm_term: attribution.utmTerm || "",
      fbclid_present: attribution.fbclidPresent ? "true" : "false",
    };

    const redirectUrl = new URL("/merci", getPublicSiteUrl(request, siteUrl));
    redirectUrl.searchParams.set("email", email);

    const response = await fetch("https://api.chariow.com/v1/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: {
          number: phoneNumber,
          country_code: countryCode,
        },
        ...(discountCode ? { discount_code: discountCode } : {}),
        redirect_url: redirectUrl.toString(),
        custom_metadata: checkoutMetadata,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      data?: {
        step?: string;
        message?: string | null;
        purchase?: {
          id?: string;
          status?: string;
          amount?: { value?: number; currency?: string };
          product?: { id?: string; name?: string };
          customer?: { email?: string };
        };
        payment?: { checkout_url?: string; transaction_id?: string };
      };
      error?: { message?: string } | string;
      message?: string;
    };

    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : payload.error && typeof payload.error.message === "string"
            ? payload.error.message
            : payload.message || payload.data?.message || "Impossible de creer le checkout Chariow";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const checkoutUrl = payload.data?.payment?.checkout_url || "";
    const chariowSaleId = payload.data?.purchase?.id || "";
    const productName = payload.data?.purchase?.product?.name || "WooPlans Premium";
    const productIdFromResponse = payload.data?.purchase?.product?.id || productId;
    const amount = Math.round(Number(payload.data?.purchase?.amount?.value || 0));
    const currency = payload.data?.purchase?.amount?.currency || "XAF";
    const status = payload.data?.purchase?.status || "awaiting_payment";

    try {
      await recordFunnelEvent({
        sessionId,
        type: "checkout_started",
        path: current.path,
        ctaId: typeof body.cta_id === "string" && body.cta_id.trim() ? body.cta_id.trim() : null,
        metadata: {
          checkout_url: checkoutUrl,
          chariow_sale_id: chariowSaleId,
          product_id: productIdFromResponse,
          product_name: productName,
          amount,
          currency,
          status,
          discount_code: discountCode,
        },
      });
    } catch (error) {
      console.error("Failed to record checkout_started funnel event:", error);
    }

    return NextResponse.json({
      checkout_url: checkoutUrl,
      redirect_url: payload.data?.step === "completed" ? redirectUrl.toString() : "",
      purchase_id: chariowSaleId,
      step: payload.data?.step || "payment",
    });
  } catch (error) {
    console.error("Failed to start Chariow checkout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de démarrer le checkout Chariow",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ method: "POST" });
}
