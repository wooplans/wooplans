import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { answerLabel, type ChantierAnswers } from "@/lib/chantier-rules";
import { CUSTOM_PLAN_DELIVERY, CUSTOM_PLAN_DEPOSIT, CUSTOM_PLAN_OFFERS, CUSTOM_PLAN_PAYMENT } from "@/lib/custom-plans";
import { loadLogo } from "@/lib/plan-pdf-assets";
import { buildProformaPdf, proformaTotals } from "@/lib/proforma-pdf";

const TYPES = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble" } as const;
export type ProformaType = keyof typeof TYPES;

export type ProformaOptions = { type?: string | null; chambres?: string | null; price?: number; discount?: number; visit?: number; model?: string | null };

/**
 * Proforma PDF d'une fiche CRM : le bouton de la fiche (avec prix, remise, visite) et le bouton « Proforma en un clic »
 * des cartes de relance (type et chambres du dossier, prix de base). Données : la fiche et le formulaire « Démarre ton
 * chantier ». Renvoie null si la fiche est introuvable ou si le prix manque (immeuble : prix négocié à saisir).
 */
export async function leadProforma(leadId: string, o: ProformaOptions = {}) {
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, leadId) });
  if (!lead) return null;
  const req = await db.query.chantierRequests.findFirst({ where: eq(schema.chantierRequests.leadId, leadId) });
  const t = o.type ?? req?.houseType ?? "villa";
  const type: ProformaType = t in TYPES ? (t as ProformaType) : "villa";
  const listPrice = CUSTOM_PLAN_OFFERS.find((x) => x.category === type)?.price ?? 0;
  const price = o.price || listPrice;
  if (!price) return null;
  const chambres = o.chambres ?? (req && req.bedrooms !== "na" ? req.bedrooms : "");
  const projectLabel = type === "immeuble" || !chambres ? TYPES[type] : `${TYPES[type]} · ${chambres === "5+" ? "5 chambres et plus" : `${chambres} chambres`}`;
  const model = o.model?.trim() || (lead.planLabel?.match(/Pub cliquée : ([^(]+)/)?.[1]?.trim() ?? null);
  const dossier = req?.code ?? null;
  const totals = proformaTotals({ price, discount: o.discount, visit: o.visit, deposit: CUSTOM_PLAN_DEPOSIT, capDiscount: type !== "immeuble" });
  const bytes = await buildProformaPdf({
    number: `PF-${dossier ?? leadId.slice(0, 8).toUpperCase()}`,
    date: new Date(),
    client: { name: lead.name, phone: lead.phone, city: lead.city ?? req?.city ?? null },
    projectLabel,
    dossier,
    model,
    relief: req && req.relief !== "na" ? answerLabel("relief", req.relief as ChantierAnswers["relief"]).toLowerCase() : null,
    price,
    discount: o.discount,
    visit: o.visit,
    deposit: CUSTOM_PLAN_DEPOSIT,
    deliverables: CUSTOM_PLAN_OFFERS[0].deliverables,
    delivery: CUSTOM_PLAN_DELIVERY,
    payment: CUSTOM_PLAN_PAYMENT,
    catalogueUrl: "wooplans.com/catalogue",
    logo: await loadLogo(),
  });
  const filename = `Proforma-WooPlans-${(dossier ?? lead.name).replace(/[^\w-]+/g, "-")}.pdf`;
  return { bytes, filename, lead, req, type, totals, projectLabel };
}
