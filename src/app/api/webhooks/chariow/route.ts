import { NextResponse } from "next/server";
import { handleChariowPulse, verifyChariowSignature, type ChariowSalePayload } from "@/lib/chariow";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  const secret = getEnv().CHARIOW_PULSE_SECRET;
  if (!secret) {
    console.error("CHARIOW_PULSE_SECRET manquant : notification refusée");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const raw = new Uint8Array(await request.arrayBuffer());
  const valid = await verifyChariowSignature(raw, request.headers.get("x-chariow-signature"), secret);
  if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  let payload: ChariowSalePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as ChariowSalePayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const outcome = await handleChariowPulse(payload, request.headers.get("x-pulse-delivery-id"));
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Chariow pulse processing failed", error);
    // 500 : Chariow réessaiera (la clé de déduplication a été libérée).
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
