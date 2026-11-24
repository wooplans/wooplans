import { runAfterSale } from "@/lib/after-sale";
import { qualifyPending, transcribePending } from "@/lib/conversation-ai";
import { sendWaInvites } from "@/lib/wa-invite";
import { qualifyLeadsBehavior } from "@/lib/lead-ai";
import { syncLeadSales } from "@/lib/lead-sync";
import { timingSafeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { runLegacyCodes } from "@/lib/legacy-codes";
import { runWhatsappSequence } from "@/lib/pipeline";
import { enrollStaleIntents, reconcileProspects, runProspectSequence } from "@/lib/prospects";

/**
 * Tâche toutes les 15 minutes (cron du Worker, voir worker.ts) : séquence de relance des prospects
 * du catalogue (paiements abandonnés / échoués, emails laissés sur le site, plan et devis offert), emails
 * après l'achat (after-sale.ts), puis, dans la fenêtre du matin, envoi des codes d'accès aux anciens abonnés (legacy-codes.ts).
 */
export async function POST(request: Request) {
  const env = getEnv();
  const secret = request.headers.get("x-cron-secret") || "";
  if (!env.CRON_SECRET || !timingSafeEqual(secret, env.CRON_SECRET)) return new Response("Non autorisé", { status: 401 });

  // Ventes du guide / de l'extrait dont la notification Chariow n'est pas arrivée : livrées ici.
  const leadSync = await syncLeadSales().catch((error) => {
    console.error("Synchro des ventes d'entrée : échec", error);
    return null;
  });
  const enrolled = await enrollStaleIntents();
  const relances = await runProspectSequence();
  // Clients du catalogue (email ou téléphone) : « converti », et « client » dans le pipeline des acheteurs du guide.
  await reconcileProspects().catch((error) => console.error("Rapprochement prospects/clients : échec", error));
  const whatsapp = await runWhatsappSequence().catch((error) => {
    console.error("Séquence WhatsApp : échec", error);
    return null;
  });
  const afterSale = await runAfterSale().catch((error) => {
    console.error("Emails après l'achat : échec", error);
    return null;
  });
  const codes = await runLegacyCodes().catch((error) => {
    console.error("Codes anciens abonnés : échec", error);
    return null;
  });
  // Conversations WhatsApp : notes vocales transcrites (ElevenLabs), puis qualification par l'IA (DeepSeek).
  const voice = await transcribePending().catch((error) => {
    console.error("Transcription des notes vocales : échec", error);
    return null;
  });
  // Leads en séquence : l'IA réanalyse dès qu'ils font quelque chose (comportement + conversation).
  const aiBehavior = await qualifyLeadsBehavior().catch((error) => {
    console.error("Qualification IA (comportement) : échec", error);
    return null;
  });
  const ai = await qualifyPending().catch((error) => {
    console.error("Qualification IA : échec", error);
    return null;
  });
  // Invitation par email à écrire sur WhatsApp (acheteurs qui ne nous ont jamais écrit, 45 min après l'achat).
  const waInvites = await sendWaInvites().catch((error) => {
    console.error("Invitations WhatsApp : échec", error);
    return null;
  });
  return Response.json({ ok: true, leadSync, enrolled, ...relances, whatsapp, afterSale, codes, voice, ai, aiBehavior, waInvites });
}
