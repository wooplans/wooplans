import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { countPublishedPlans } from "@/lib/plans";
import { recordManualSend, relanceMessage, relanceQueue, relanceWhatsappUrl } from "@/lib/relances";

export const dynamic = "force-dynamic";

/**
 * Bouton « Envoyer sur WhatsApp » de /admin/relances : note le message comme envoyé (le suivant est programmé),
 * puis ouvre WhatsApp sur la conversation du client avec le message déjà écrit. Un second clic sur le même
 * message ne le compte pas deux fois (verrou sur l'étape) mais rouvre quand même WhatsApp.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const step = Number(url.searchParams.get("etape"));
  const p = id ? await getDb().query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { id: true, phone: true } }) : null;
  if (!p?.phone || !Number.isInteger(step) || step < 0 || step > 2) return Response.redirect(new URL("/admin/relances", url), 303);
  const item = (await relanceQueue()).find((i) => i.id === id);
  const text = relanceMessage(
    { id, name: item?.name ?? null, offer: item?.offer ?? "guide", intentId: item?.intentId ?? null, step: step as 0 | 1 | 2 },
    (await countPublishedPlans()) ?? 0,
  );
  await recordManualSend(id, step);
  return new Response(null, { status: 302, headers: { Location: relanceWhatsappUrl(p.phone, text), "Cache-Control": "no-store" } });
}
