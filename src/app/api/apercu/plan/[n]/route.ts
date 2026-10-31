import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { burnWatermark, loadPdfFloorPlan } from "@/lib/plan-pdf-assets";
import { SHOWCASE_CODE } from "@/lib/sales-page";

/**
 * Plans cotés du SEUL modèle de démonstration de la page de vente (SHOWCASE_CODE), en accès public :
 * l'échantillon du catalogue montré aux visiteurs. Filigranés (incrustés dans les pixels), jamais l'original.
 * /api/apercu/plan/1 = premier niveau (RDC), /2 = étage… Aucun autre modèle n'est accessible ici.
 */
const MARK = { id: "apercu-page-de-vente", lines: ["www.wooplans.com · Plan WOOPLANS · Reproduction interdite", `Exemple du Catalogue Premium · ${SHOWCASE_CODE}`] };

export async function GET(_request: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const index = /^[1-9]$/.test(n) ? Number(n) - 1 : -1;
  const plan = await getDb().query.plans.findFirst({
    columns: { floorPlans: true },
    where: and(eq(schema.plans.code, SHOWCASE_CODE), eq(schema.plans.status, "published")),
  });
  const key = plan?.floorPlans[index];
  if (!key) return new Response("Introuvable", { status: 404 });
  const asset = await loadPdfFloorPlan(key);
  if (!asset || asset.type === "pdf") return new Response("Introuvable", { status: 404 });
  const marked = await burnWatermark(asset, MARK, "plan", `${key}@apercu`);
  return new Response(marked.bytes, {
    headers: {
      "Content-Type": marked.type === "png" ? "image/png" : "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
