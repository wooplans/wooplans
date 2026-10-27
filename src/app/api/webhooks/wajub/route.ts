import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { handleWajubEvent, verifyWajubSignature, type WajubEvent } from "@/lib/wajub";

export async function POST(request: Request) {
  const secret = getEnv().WAJUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("WAJUB_WEBHOOK_SECRET manquant : notification refusée");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const raw = new Uint8Array(await request.arrayBuffer());
  const valid = await verifyWajubSignature(
    raw,
    request.headers.get("x-wajub-signature"),
    request.headers.get("x-wajub-timestamp"),
    secret,
  );
  if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });

  let event: WajubEvent;
  try {
    event = JSON.parse(new TextDecoder().decode(raw)) as WajubEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const outcome = await handleWajubEvent(event);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Wajub notification processing failed", error);
    // 500 : Wajub réessaiera (la clé de déduplication a été libérée).
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
