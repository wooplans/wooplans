import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentAdmin } from "@/lib/auth";
import { fileName } from "@/lib/plan-pdf";
import { renderPlanPdf } from "@/lib/plan-pdf-render";
import { getPremiumPlan } from "@/lib/plans";

/**
 * Tableau de bord (ventes) : plan et devis d'un achat, filigrané au nom de l'acheteur exactement comme son
 * lien personnel (même identifiant), pour l'envoyer à la main sur WhatsApp quand l'email n'est pas arrivé.
 * Réservé à l'administrateur connecté ; ne compte pas dans les 10 téléchargements de l'acheteur.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return new Response("Non autorisé.", { status: 401 });
  const db = getDb();
  const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, (await params).id) });
  if (!intent?.planSlug || (intent.status !== "paid" && intent.status !== "gift")) return new Response("Achat introuvable ou non payé.", { status: 404 });
  const plan = await getPremiumPlan(intent.planSlug);
  if (!plan) return new Response("Modèle introuvable.", { status: 404 });
  const sale = intent.saleId ? await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, intent.saleId) }) : null;
  const { bytes } = await renderPlanPdf(plan, { id: intent.id, email: intent.email || sale?.email || "client", name: sale?.name });
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
