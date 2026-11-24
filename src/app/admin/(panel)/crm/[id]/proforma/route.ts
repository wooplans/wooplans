import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentAdmin } from "@/lib/auth";
import { answerLabel, type ChantierAnswers } from "@/lib/chantier-rules";
import { CUSTOM_PLAN_DELIVERY, CUSTOM_PLAN_DEPOSIT, CUSTOM_PLAN_OFFERS, CUSTOM_PLAN_PAYMENT } from "@/lib/custom-plans";
import { loadLogo } from "@/lib/plan-pdf-assets";
import { buildProformaPdf } from "@/lib/proforma-pdf";

export const dynamic = "force-dynamic";

const TYPES = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble" } as const;

/**
 * Proforma PDF d'une fiche CRM (bouton « Proforma » de la fiche). Le type, le prix, la remise et la visite viennent du
 * petit formulaire de la fiche ; le reste (nom, téléphone, ville, dossier, modèle, relief) de la fiche et du
 * formulaire « Démarre ton chantier ».
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead) return new Response("Fiche introuvable", { status: 404 });
  const req = await db.query.chantierRequests.findFirst({ where: eq(schema.chantierRequests.leadId, id) });

  const q = new URL(request.url).searchParams;
  const num = (k: string) => Math.max(0, Number((q.get(k) || "0").replace(/\D/g, "")) || 0);
  const type = (q.get("type") as keyof typeof TYPES) in TYPES ? (q.get("type") as keyof typeof TYPES) : "villa";
  const listPrice = CUSTOM_PLAN_OFFERS.find((o) => o.category === type)?.price ?? 0;
  const price = num("prix") || listPrice;
  if (!price) return new Response("Indiquez le prix (immeuble : prix négocié).", { status: 400 });
  const chambres = q.get("chambres") || (req && req.bedrooms !== "na" ? req.bedrooms : "");
  const projectLabel = type === "immeuble" || !chambres ? TYPES[type] : `${TYPES[type]} · ${chambres === "5+" ? "5 chambres et plus" : `${chambres} chambres`}`;
  const model = (q.get("modele") || "").trim() || (lead.planLabel?.match(/Pub cliquée : ([^(]+)/)?.[1]?.trim() ?? null);
  const dossier = req?.code ?? null;

  const bytes = await buildProformaPdf({
    number: `PF-${dossier ?? id.slice(0, 8).toUpperCase()}`,
    date: new Date(),
    client: { name: lead.name, phone: lead.phone, city: lead.city ?? req?.city ?? null },
    projectLabel,
    dossier,
    model,
    relief: req && req.relief !== "na" ? answerLabel("relief", req.relief as ChantierAnswers["relief"]).toLowerCase() : null,
    price,
    discount: num("remise"),
    visit: num("visite"),
    deposit: CUSTOM_PLAN_DEPOSIT,
    deliverables: CUSTOM_PLAN_OFFERS[0].deliverables,
    delivery: CUSTOM_PLAN_DELIVERY,
    payment: CUSTOM_PLAN_PAYMENT,
    catalogueUrl: "wooplans.com/catalogue",
    logo: await loadLogo(),
  });
  const file = `proforma-${(dossier ?? lead.name).replace(/[^\w-]+/g, "-")}.pdf`;
  return new Response(bytes, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${file}"`, "cache-control": "no-store" } });
}
