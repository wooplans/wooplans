import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { GUIDE_FILE_NAME, GUIDE_PDF_ASSET, isGuideIntent } from "@/lib/guide";

/**
 * Guide d'entrée acheté : le lien personnel est l'identifiant de l'achat (aléatoire, 128 bits), envoyé par email et
 * affiché sur /merci. Réservé aux achats confirmés ; le PDF vient des fichiers statiques du site (public/lp).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const intent = await getDb().query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, id) });
  if (!intent || !isGuideIntent(intent) || intent.status !== "paid") {
    return new Response("Lien invalide ou paiement non confirmé.", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  const asset = await getEnv().ASSETS!.fetch(new URL(GUIDE_PDF_ASSET, request.url));
  if (!asset.ok) return new Response("Guide momentanément indisponible. Écrivez-nous sur WhatsApp.", { status: 502 });
  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${GUIDE_FILE_NAME}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
