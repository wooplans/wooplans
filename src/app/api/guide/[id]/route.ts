import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { GUIDE, GUIDE_CTA_ID } from "@/lib/guide";

/** Téléchargements autorisés par achat (autre téléphone, fichier perdu…). */
const MAX_DOWNLOADS = 15;

/**
 * Guide WooPlans des maisons (PDF dans R2, clé src/config/guide.json « pdfKey ») : le lien personnel est
 * l'identifiant de l'achat (aléatoire), envoyé par email et affiché sur la page de remerciement.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = (await params).id;
  const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, id), columns: { id: true, ctaId: true, status: true } });
  if (!intent || intent.ctaId !== GUIDE_CTA_ID || intent.status !== "paid") {
    return new Response("Lien invalide ou paiement non confirmé.", { status: 404 });
  }
  const object = await getEnv().MEDIA.get(GUIDE.pdfKey);
  if (!object) return new Response("Le guide est en cours de mise à jour. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp.", { status: 503 });

  const counted = await db
    .update(schema.checkoutIntents)
    .set({ downloads: sql`${schema.checkoutIntents.downloads} + 1`, updatedAt: new Date() })
    .where(and(eq(schema.checkoutIntents.id, intent.id), lt(schema.checkoutIntents.downloads, MAX_DOWNLOADS)))
    .returning({ id: schema.checkoutIntents.id });
  if (counted.length === 0) {
    return new Response("Nombre maximal de téléchargements atteint. Écrivez-nous sur WhatsApp pour recevoir à nouveau votre guide.", { status: 429 });
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename="${GUIDE.pdfFileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
