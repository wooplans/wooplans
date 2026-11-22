import { extraitBuyer, extraitPdfCount, isUnlocked, recordExtraitEvent } from "@/lib/extrait-web";
import { PDF_PER_MODEL_LIMIT } from "@/lib/extrait-web-rules";
import { fileName } from "@/lib/plan-pdf";
import { renderPlanPdf } from "@/lib/plan-pdf-render";
import { getPremiumPlan } from "@/lib/plans";

/**
 * Fiche PDF d'une des 5 maisons de l'extrait (même fiche que l'Espace Premium, filigranée au nom de l'acheteur),
 * au plus 3 fois par maison. Les autres maisons sont verrouillées.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  if (!isUnlocked(slug)) return Response.redirect(new URL(`/mon-extrait/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`, request.url), 303);
  const [buyer, plan] = await Promise.all([extraitBuyer(id), getPremiumPlan(slug)]);
  if (!buyer || !plan) return new Response("Introuvable", { status: 404 });
  if ((await extraitPdfCount(buyer.intentId, slug)) >= PDF_PER_MODEL_LIMIT) {
    return new Response("Vous avez déjà téléchargé cette fiche plusieurs fois. Écrivez-nous sur WhatsApp si vous en avez encore besoin.", {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const { bytes } = await renderPlanPdf(plan, { id: buyer.intentId, email: buyer.email || "acheteur de l'extrait", name: buyer.name });
  await recordExtraitEvent(buyer, "pdf", slug).catch(() => {});
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(plan.code)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
