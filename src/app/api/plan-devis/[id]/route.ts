import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fileName } from "@/lib/plan-pdf";
import { renderPlanPdf } from "@/lib/plan-pdf-render";
import { getPremiumPlan } from "@/lib/plans";

/** Téléchargements autorisés par achat (renvoi sur un autre téléphone, fichier perdu…). */
const MAX_DOWNLOADS = 10;

/**
 * Plan et devis d'un modèle acheté : le lien personnel est l'identifiant de l'achat (aléatoire,
 * 128 bits), envoyé par email et affiché sur /merci. Document filigrané au nom de l'acheteur.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = (await params).id;
  const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, id) });
  if (!intent?.planSlug || intent.status !== "paid") return new Response("Lien invalide ou paiement non confirmé.", { status: 404 });
  const plan = await getPremiumPlan(intent.planSlug);
  if (!plan) return new Response("Modèle introuvable.", { status: 404 });

  const counted = await db
    .update(schema.checkoutIntents)
    .set({ downloads: sql`${schema.checkoutIntents.downloads} + 1`, updatedAt: new Date() })
    .where(and(eq(schema.checkoutIntents.id, intent.id), lt(schema.checkoutIntents.downloads, MAX_DOWNLOADS)))
    .returning({ id: schema.checkoutIntents.id });
  if (counted.length === 0) {
    return new Response("Nombre maximal de téléchargements atteint. Écrivez-nous sur WhatsApp pour recevoir à nouveau votre document.", {
      status: 429,
    });
  }

  const sale = intent.saleId ? await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, intent.saleId) }) : null;
  const { bytes } = await renderPlanPdf(plan, { id: intent.id, email: intent.email || "client", name: sale?.name });
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(plan.code)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
