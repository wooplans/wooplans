import { timingSafeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { runLegacyCodes } from "@/lib/legacy-codes";
import { enrollStaleIntents, runProspectSequence } from "@/lib/prospects";

/**
 * Tâche toutes les 15 minutes (cron du Worker, voir worker.ts) : séquence de relance des prospects
 * du catalogue (paiements abandonnés / échoués, emails laissés sur le site), puis, dans la fenêtre
 * du matin, envoi des codes d'accès aux anciens abonnés (legacy-codes.ts).
 */
export async function POST(request: Request) {
  const env = getEnv();
  const secret = request.headers.get("x-cron-secret") || "";
  if (!env.CRON_SECRET || !timingSafeEqual(secret, env.CRON_SECRET)) return new Response("Non autorisé", { status: 401 });

  const enrolled = await enrollStaleIntents();
  const relances = await runProspectSequence();
  const codes = await runLegacyCodes().catch((error) => {
    console.error("Codes anciens abonnés : échec", error);
    return null;
  });
  return Response.json({ ok: true, enrolled, ...relances, codes });
}
