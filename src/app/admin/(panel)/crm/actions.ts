"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { memberCatalogueCredit } from "@/lib/members";
import { LEAD_STAGES, type LeadStage } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { randomId } from "@/lib/crypto";
import { leadFollowUpEmail, sendEmail } from "@/lib/email";

const STAGE_LABELS: Record<LeadStage, string> = {
  demande: "Demande",
  qualification: "Qualification",
  devis: "Devis",
  commande: "Commande",
  production: "Production",
  livraison: "Livraison",
  termine: "Terminé",
  perdu: "Perdu",
};

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const n = Number(v.replace(/[\s  ]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};
const date = (f: FormData, k: string) => {
  const v = str(f, k);
  return v ? new Date(`${v}T09:00:00`) : null;
};

async function log(leadId: string, kind: "note" | "stage" | "email" | "payment" | "call", body: string, author: string) {
  await getDb().insert(schema.leadActivities).values({ id: randomId(), leadId, kind, body, author });
}

const CHANNELS = ["site", "whatsapp", "telephone", "facebook", "bouche_a_oreille", "autre"] as const;

export async function createLead(form: FormData) {
  const admin = await requireAdmin();
  const name = str(form, "name");
  if (!name) throw new Error("Nom requis");
  const channel = CHANNELS.find((c) => c === str(form, "channel")) ?? "whatsapp";
  const id = randomId();
  const db = getDb();
  const email = str(form, "email")?.toLowerCase() ?? null;
  const member = email ? await db.query.members.findFirst({ where: eq(schema.members.email, email) }) : null;
  await db.insert(schema.leads).values({
    id,
    name,
    phone: str(form, "phone"),
    email,
    city: str(form, "city"),
    country: str(form, "country"),
    planLabel: str(form, "planLabel"),
    channel,
    stage: "demande",
    projectDetails: str(form, "projectDetails") ?? "",
    memberId: member?.id ?? null,
    catalogueCredit: member ? await memberCatalogueCredit(member.id) : 0,
    nextFollowUpAt: date(form, "nextFollowUpAt"),
  });
  await log(id, "note", `Demande ajoutée manuellement (canal : ${channel}).`, admin.email);
  redirect(`/admin/crm/${id}`);
}

export async function updateLead(id: string, form: FormData) {
  const admin = await requireAdmin();
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead) throw new Error("Demande introuvable");
  const stage = LEAD_STAGES.find((s) => s === str(form, "stage")) ?? lead.stage;
  await db
    .update(schema.leads)
    .set({
      name: str(form, "name") ?? lead.name,
      phone: str(form, "phone"),
      email: str(form, "email")?.toLowerCase() ?? null,
      city: str(form, "city"),
      country: str(form, "country"),
      planLabel: str(form, "planLabel"),
      stage,
      projectDetails: str(form, "projectDetails") ?? "",
      landDetails: str(form, "landDetails") ?? "",
      budget: int(form, "budget"),
      agreedPrice: int(form, "agreedPrice"),
      catalogueCredit: int(form, "catalogueCredit") ?? 0,
      nextFollowUpAt: date(form, "nextFollowUpAt"),
      lostReason: stage === "perdu" ? str(form, "lostReason") : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.leads.id, id));
  if (stage !== lead.stage) await log(id, "stage", `${STAGE_LABELS[lead.stage]} → ${STAGE_LABELS[stage]}`, admin.email);
  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}

export async function moveLead(id: string, stage: LeadStage) {
  const admin = await requireAdmin();
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead || lead.stage === stage) return;
  await db.update(schema.leads).set({ stage, updatedAt: new Date() }).where(eq(schema.leads.id, id));
  await log(id, "stage", `${STAGE_LABELS[lead.stage]} → ${STAGE_LABELS[stage]}`, admin.email);
  revalidatePath("/admin/crm");
}

export async function addNote(id: string, form: FormData) {
  const admin = await requireAdmin();
  const body = str(form, "body");
  const kind = str(form, "kind") === "call" ? "call" : "note";
  if (body) await log(id, kind, body, admin.email);
  const follow = date(form, "nextFollowUpAt");
  if (follow) await getDb().update(schema.leads).set({ nextFollowUpAt: follow, updatedAt: new Date() }).where(eq(schema.leads.id, id));
  revalidatePath(`/admin/crm/${id}`);
}

export async function addPayment(id: string, form: FormData) {
  const admin = await requireAdmin();
  const amount = int(form, "amount");
  if (!amount || amount <= 0) throw new Error("Montant invalide");
  await getDb()
    .insert(schema.leadPayments)
    .values({
      id: randomId(),
      leadId: id,
      amount,
      method: str(form, "method") ?? "mobile_money",
      reference: str(form, "reference"),
      note: str(form, "note"),
      paidAt: date(form, "paidAt") ?? new Date(),
    });
  await log(id, "payment", `Encaissement de ${amount.toLocaleString("fr-FR")} FCFA (${str(form, "method") ?? "mobile_money"}).`, admin.email);
  revalidatePath(`/admin/crm/${id}`);
}

export async function deletePayment(leadId: string, paymentId: string) {
  const admin = await requireAdmin();
  await getDb().delete(schema.leadPayments).where(eq(schema.leadPayments.id, paymentId));
  await log(leadId, "payment", "Encaissement supprimé.", admin.email);
  revalidatePath(`/admin/crm/${leadId}`);
}

export async function sendLeadEmail(id: string, form: FormData) {
  const admin = await requireAdmin();
  const lead = await getDb().query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead?.email) throw new Error("Cette demande n'a pas d'email");
  const subject = str(form, "subject") ?? "Votre projet de maison avec WOOPLANS";
  const message = str(form, "message");
  if (!message) throw new Error("Message vide");
  const mail = leadFollowUpEmail({ name: lead.name, subject, message });
  const result = await sendEmail({ to: lead.email, ...mail, template: "lead_follow_up", leadId: id });
  await log(id, "email", result.ok ? `Email envoyé : « ${subject} »` : `Échec de l'email « ${subject} » : ${result.error}`, admin.email);
  const follow = date(form, "nextFollowUpAt");
  if (follow) await getDb().update(schema.leads).set({ nextFollowUpAt: follow }).where(eq(schema.leads.id, id));
  revalidatePath(`/admin/crm/${id}`);
}

export async function deleteLead(id: string) {
  await requireAdmin();
  await getDb().delete(schema.leads).where(eq(schema.leads.id, id));
  redirect("/admin/crm");
}
