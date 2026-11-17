import { getEnv } from "@/lib/env";
import { recordWhatsappRead, recordWhatsappReply } from "@/lib/pipeline";
import { isStopRequest, verifyGenukaSignature } from "@/lib/whatsapp";

type Inbound = { from?: string; type?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string } } };

/**
 * Webhook Genuka (évènement « messages ») : statuts des messages envoyés (« read » → tiède) et messages reçus
 * (réponse → chaud, « STOP » → désinscrit). Signature HMAC vérifiée sur le corps brut ; réponse 200 immédiate.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = getEnv().GENUKA_WEBHOOK_SECRET;
  if (!secret || !(await verifyGenukaSignature(request.headers.get("x-genuka-signature"), raw, secret))) {
    return new Response("Signature invalide", { status: 401 });
  }
  let event: { type?: string; data?: Record<string, unknown> } | null = null;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }
  const data = (event?.data ?? {}) as Record<string, unknown>;
  try {
    // Statut d'un message envoyé : { status: "read", recipient_id: "237…" } (ou la liste Meta « statuses »).
    const statuses = (Array.isArray(data.statuses) ? data.statuses : data.status ? [data] : []) as { status?: string; recipient_id?: string }[];
    for (const s of statuses) {
      if (s.status === "read" && s.recipient_id) await recordWhatsappRead(String(s.recipient_id).replace(/\D/g, ""));
    }
    // Message reçu : liste Meta « messages », ou un seul message.
    const messages = (Array.isArray(data.messages) ? data.messages : data.from ? [data] : []) as Inbound[];
    for (const m of messages) {
      if (!m.from) continue;
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? "";
      await recordWhatsappReply(String(m.from).replace(/\D/g, ""), isStopRequest(text));
    }
  } catch (error) {
    console.error("Webhook WhatsApp : traitement impossible", error);
  }
  return new Response("ok");
}
