import { getCurrentAdmin } from "@/lib/auth";
import { leadProforma } from "@/lib/proforma";

export const dynamic = "force-dynamic";

/** Proforma PDF d'une fiche CRM (formulaire « Proforma » de la fiche : type, chambres, prix, remise, visite, modèle). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const q = new URL(request.url).searchParams;
  const num = (k: string) => Math.max(0, Number((q.get(k) || "0").replace(/\D/g, "")) || 0);
  const pf = await leadProforma(id, { type: q.get("type"), chambres: q.get("chambres") || null, price: num("prix"), discount: num("remise"), visit: num("visite"), model: q.get("modele") });
  if (!pf) return new Response("Fiche introuvable, ou prix manquant (immeuble : saisir le prix négocié).", { status: 400 });
  return new Response(pf.bytes, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${pf.filename}"`, "cache-control": "no-store" } });
}
