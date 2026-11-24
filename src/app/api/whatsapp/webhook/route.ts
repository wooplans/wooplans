import { recordWaMessage } from "@/lib/conversation-ai";
import { linkChantierByCode } from "@/lib/chantier";
import { getEnv } from "@/lib/env";
import { linkWhatsappByOrderCode, recordWhatsappFailed, recordWhatsappRead, recordWhatsappReply } from "@/lib/pipeline";
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
      if (!s.recipient_id) continue;
      const to = String(s.recipient_id).replace(/\D/g, "");
      if (s.status === "read") await recordWhatsappRead(to);
      else if (s.status === "failed") await recordWhatsappFailed(to);
    }
    // Message reçu : liste Meta « messages », ou un seul message.
    // Les copies des messages que Tao envoie lui-même depuis WhatsApp Business (« coexistence », champ « to ») ne sont pas des réponses.
    const echo = /echo/i.test(String((event as { event?: string })?.event ?? event?.type ?? "")) || Boolean(data.to);
    // Conversation (étape 5) : les copies des messages de Tao sont gardées pour que l'IA lise toute la conversation.
    if (echo && data.id) await recordWaMessage(data as Parameters<typeof recordWaMessage>[0], "out").catch((error) => console.error("Conversation : copie non enregistrée", error));
    const messages = (Array.isArray(data.messages) ? data.messages : data.from && !echo ? [data] : []) as Inbound[];
    for (const m of messages) {
      if (!m.from) continue;
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? "";
      const from = String(m.from).replace(/\D/g, "");
      // Code de commande de la page merci : le numéro WhatsApp remplace celui de la fiche avant d'enregistrer la réponse.
      await linkWhatsappByOrderCode(from, text).catch((error) => console.error("Rattachement du numéro WhatsApp : échec", error));
      // Dossier « Démarre ton chantier » (code CH-…) : réponses du formulaire rattachées au numéro, fiche CRM créée.
      await linkChantierByCode(from, text).catch((error) => console.error("Dossier chantier : rattachement impossible", error));
      await recordWhatsappReply(from, isStopRequest(text));
      await recordWaMessage(m as Parameters<typeof recordWaMessage>[0], "in").catch((error) => console.error("Conversation : message non enregistré", error));
    }
  } catch (error) {
    console.error("Webhook WhatsApp : traitement impossible", error);
  }
  return new Response("ok");
}
