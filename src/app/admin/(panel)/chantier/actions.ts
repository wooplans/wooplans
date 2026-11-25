"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { CHANTIER_DEPOSIT } from "@/lib/chantier-rules";
import { randomId } from "@/lib/crypto";

const ADVANCED = ["commande", "production", "livraison", "termine"];

async function load(id: string) {
  await requireAdmin();
  const db = getDb();
  const req = await db.query.chantierRequests.findFirst({ where: eq(schema.chantierRequests.id, id) });
  const lead = req?.leadId ? await db.query.leads.findFirst({ where: eq(schema.leads.id, req.leadId) }) : null;
  return { db, req, lead };
}

async function note(leadId: string, body: string) {
  await getDb().insert(schema.leadActivities).values({ id: randomId(), leadId, kind: "stage", body, author: "admin" });
}

/** Bouton « Perdu » de la carte. */
export async function markLost(id: string) {
  const { db, req, lead } = await load(id);
  if (!req || !lead) return;
  await db.update(schema.chantierRequests).set({ aiStep: "perdu", aiFollowUp: null, aiLostReason: "Marqué perdu par Tao" }).where(eq(schema.chantierRequests.id, id));
  if (!ADVANCED.includes(lead.stage)) await db.update(schema.leads).set({ stage: "perdu", nextFollowUpAt: null, lostReason: lead.lostReason || "Marqué perdu depuis les relances" }).where(eq(schema.leads.id, lead.id));
  await note(lead.id, "Marqué perdu depuis l'onglet Plans complets.");
  revalidatePath("/admin/chantier");
}

/** Bouton « Reporter » : nouvelle date de relance. */
export async function postpone(id: string, form: FormData) {
  const date = String(form.get("date") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const { db, req, lead } = await load(id);
  if (!req || !lead) return;
  await db.update(schema.chantierRequests).set({ aiFollowUp: date, relanceClickedAt: null }).where(eq(schema.chantierRequests.id, id));
  await db.update(schema.leads).set({ nextFollowUpAt: new Date(`${date}T08:00:00Z`) }).where(eq(schema.leads.id, lead.id));
  await note(lead.id, `Relance reportée au ${new Date(`${date}T08:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.`);
  revalidatePath("/admin/chantier");
}

/** Bouton « Avance reçue » : engagé, étape Commande, encaissement de l'avance noté. */
export async function depositReceived(id: string) {
  const { db, req, lead } = await load(id);
  if (!req || !lead) return;
  const now = new Date();
  await db
    .update(schema.chantierRequests)
    .set({ aiStep: "engage", aiFollowUp: new Date(now.getTime() + 2 * 86_400_000).toISOString().slice(0, 10), aiMessageId: "avance-recue", relanceClickedAt: null })
    .where(eq(schema.chantierRequests.id, id));
  if (!ADVANCED.includes(lead.stage)) await db.update(schema.leads).set({ stage: "commande" }).where(eq(schema.leads.id, lead.id));
  await db.insert(schema.leadPayments).values({ id: randomId(), leadId: lead.id, amount: CHANTIER_DEPOSIT, method: "mobile_money", reference: "Avance (Orange Money)", paidAt: now });
  await note(lead.id, `Avance de ${CHANTIER_DEPOSIT.toLocaleString("fr-FR")} FCFA reçue : engagé. Activer l'accès Premium et créer le groupe WhatsApp du projet.`);
  revalidatePath("/admin/chantier");
}
