import { getEnv } from "@/lib/env";
import { extraitBuyer, isUnlocked } from "@/lib/extrait-web";
import { burnWatermark, loadPdfFloorPlan } from "@/lib/plan-pdf-assets";
import { getPremiumPlan } from "@/lib/plans";
import { imageMarkForMember } from "@/lib/watermark";

/**
 * Plan coté d'une des 5 maisons de l'extrait, pour son acheteur (lien personnel) : filigrané à son nom dans les pixels,
 * comme dans l'Espace Premium. Les autres maisons ne sont jamais servies ici.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; slug: string; n: string }> }) {
  const { id, slug, n } = await params;
  const index = /^[1-9]$/.test(n) ? Number(n) - 1 : -1;
  if (index < 0 || !isUnlocked(slug)) return new Response("Introuvable", { status: 404 });
  const [buyer, plan] = await Promise.all([extraitBuyer(id), getPremiumPlan(slug)]);
  const key = plan?.floorPlans[index];
  if (!buyer || !key) return new Response("Introuvable", { status: 404 });
  const asset = await loadPdfFloorPlan(key);
  if (!asset || asset.type === "pdf") return new Response("Introuvable", { status: 404 });
  const mark = imageMarkForMember({ id: buyer.intentId, email: buyer.email || "acheteur de l'extrait", name: buyer.name }, getEnv().SITE_URL);
  const marked = await burnWatermark(asset, mark, "plan", `${key}@extrait-${buyer.intentId}`);
  return new Response(marked.bytes, {
    headers: {
      "Content-Type": marked.type === "png" ? "image/png" : "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
