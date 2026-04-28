export type FunnelSource = "organic" | "facebook_ads";

export type FunnelEventType =
  | "page_view"
  | "premium_cta_click"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_abandoned"
  | "checkout_failed";

export type FunnelAttribution = {
  source: FunnelSource;
  landingPath: string;
  referrer: string | null;
  fbclidPresent: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

export type FunnelSessionSnapshot = FunnelAttribution & {
  sessionId: string;
};

const FACEBOOK_MARKERS = ["facebook", "fb", "meta", "instagram", "ig"];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasFacebookMarker(value: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return FACEBOOK_MARKERS.some((marker) => normalized.includes(marker));
}

export function classifyFunnelSource({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams?: URLSearchParams | null;
}) {
  const normalizedPath = normalizePath(pathname);
  const params = searchParams ?? new URLSearchParams();
  const fbclidPresent = params.has("fbclid");

  const utmSource = normalizeText(params.get("utm_source"));
  const utmMedium = normalizeText(params.get("utm_medium"));
  const utmCampaign = normalizeText(params.get("utm_campaign"));
  const utmContent = normalizeText(params.get("utm_content"));
  const utmTerm = normalizeText(params.get("utm_term"));

  const hasFacebookUtm =
    hasFacebookMarker(utmSource) ||
    hasFacebookMarker(utmCampaign) ||
    hasFacebookMarker(utmContent) ||
    hasFacebookMarker(utmTerm) ||
    hasFacebookMarker(utmMedium) ||
    Boolean(utmMedium && /^(paid_social|social|cpc|ppc|paid)$/i.test(utmMedium));

  const source: FunnelSource =
    normalizedPath.startsWith("/abonnement-facebook") || fbclidPresent || hasFacebookUtm
      ? "facebook_ads"
      : "organic";

  return {
    source,
    landingPath: normalizedPath,
    fbclidPresent,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
  } satisfies Omit<FunnelAttribution, "referrer">;
}

export function buildFunnelAttribution({
  pathname,
  searchParams,
  referrer,
}: {
  pathname: string;
  searchParams?: URLSearchParams | null;
  referrer?: string | null;
}): FunnelAttribution {
  return {
    ...classifyFunnelSource({ pathname, searchParams }),
    referrer: normalizeText(referrer),
  };
}

export function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

export function parseFunnelJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function sanitizeMetadataInput(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object") return {};

  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key) continue;
    const normalizedKey = key.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
    if (!normalizedKey) continue;

    let normalizedValue = "";
    if (typeof raw === "string") {
      normalizedValue = raw.trim();
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      normalizedValue = String(raw);
    } else if (typeof raw === "boolean") {
      normalizedValue = raw ? "true" : "false";
    } else if (raw instanceof Date) {
      normalizedValue = raw.toISOString();
    } else if (raw && typeof raw === "object") {
      normalizedValue = safeJsonStringify(raw);
    }

    if (!normalizedValue) continue;
    output[normalizedKey] = normalizedValue.slice(0, 255);
  }

  return output;
}
