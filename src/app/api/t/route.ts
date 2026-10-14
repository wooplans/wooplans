import { NextResponse, type NextRequest } from "next/server";
import { parseAttribution } from "@/lib/attribution";
import { randomId } from "@/lib/crypto";
import { runInBackground } from "@/lib/env";
import { VISITOR_COOKIE } from "@/lib/session";
import { deviceFromUserAgent, recordServerEvent, upsertVisitor } from "@/lib/tracking";

const ALLOWED = new Set([
  "page_view",
  "plan_view",
  "cta_click",
  "sales_page_view",
  "checkout_start",
  "whatsapp_click",
  "custom_plan_request",
]);

type Body = { type?: string; url?: string; referrer?: string | null; ctaId?: string; planSlug?: string };

/** Balise de suivi du tunnel (first-party, sans cookie tiers). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.type || !ALLOWED.has(body.type) || !body.url) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (/bot|crawler|spider|preview|lighthouse/i.test(request.headers.get("user-agent") || "")) {
    return NextResponse.json({ ok: true });
  }

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const isNew = !visitorId || !/^[A-Za-z0-9_-]{16,32}$/.test(visitorId);
  if (isNew) visitorId = randomId();
  const id = visitorId!;

  const path = (() => {
    try {
      return new URL(body.url!, request.url).pathname;
    } catch {
      return "/";
    }
  })();

  runInBackground(
    (async () => {
      await upsertVisitor(id, isNew ? parseAttribution(body.url!, body.referrer ?? null) : null, {
        country: request.headers.get("cf-ipcountry"),
        device: deviceFromUserAgent(request.headers.get("user-agent")),
      });
      await recordServerEvent({ visitorId: id, type: body.type!, path, ctaId: body.ctaId, planSlug: body.planSlug });
    })(),
  );

  const response = NextResponse.json({ ok: true });
  if (isNew) {
    response.cookies.set(VISITOR_COOKIE, id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
