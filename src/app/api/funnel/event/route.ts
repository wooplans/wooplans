import { NextResponse } from "next/server";
import { ensureFunnelSession, recordFunnelEvent } from "@/lib/funnel-db";
import { buildFunnelAttribution, type FunnelEventType } from "@/lib/funnel";

export const runtime = "edge";

type FunnelEventBody = {
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
  event_type?: FunnelEventType;
  path?: string;
  cta_id?: string | null;
  metadata?: Record<string, unknown>;
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FunnelEventBody;
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const eventType = body.event_type;
    const rawLandingPath = typeof body.landing_path === "string" ? body.landing_path : "/";
    const rawPath = typeof body.path === "string" ? body.path : rawLandingPath;

    if (!sessionId) {
      return NextResponse.json({ error: "session_id manquant" }, { status: 400 });
    }

    const browserEvents = new Set(["page_view", "premium_cta_click", "scroll_depth", "section_view", "engagement_ping", "page_exit"]);
    if (!eventType || !browserEvents.has(eventType)) {
      return NextResponse.json({ error: "Événement navigateur invalide" }, { status: 400 });
    }

    const landing = parsePath(rawLandingPath);
    const current = parsePath(rawPath, landing.path);
    const searchParams = new URLSearchParams();
    if (body.fbclid_present) {
      searchParams.set("fbclid", "1");
    }
    if (body.utm_source) searchParams.set("utm_source", body.utm_source);
    if (body.utm_medium) searchParams.set("utm_medium", body.utm_medium);
    if (body.utm_campaign) searchParams.set("utm_campaign", body.utm_campaign);
    if (body.utm_content) searchParams.set("utm_content", body.utm_content);
    if (body.utm_term) searchParams.set("utm_term", body.utm_term);
    const attribution = buildFunnelAttribution({
      pathname: landing.pathname,
      searchParams,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
    });

    await ensureFunnelSession({
      sessionId,
      ...attribution,
    });

    await recordFunnelEvent({
      sessionId,
      type: eventType,
      path: current.path,
      ctaId: typeof body.cta_id === "string" && body.cta_id.trim() ? body.cta_id.trim() : null,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record funnel event:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'evenement du tunnel" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ method: "POST" });
}
