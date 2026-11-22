"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendExtraitAnnounce } from "@/lib/extrait-web-announce";
import { correctWhatsappNumber, findProspectForReopen, markNoWhatsapp, reopenReservedOffer, undoManualSend } from "@/lib/relances";

/** « Pas envoyé » : le message revient dans la file du jour. */
export async function undoRelance(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (id) await undoManualSend(id);
  revalidatePath("/admin/relances");
}

/** « Pas de WhatsApp » : la carte disparaît des relances WhatsApp ; les emails continuent. */
export async function noWhatsapp(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (id) await markNoWhatsapp(id);
  revalidatePath("/admin/relances");
}

/** Correction du numéro WhatsApp de la fiche. */
export async function fixWhatsappNumber(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const phone = String(form.get("phone") || "");
  if (id && phone) await correctWhatsappNumber(id, phone);
  revalidatePath("/admin/relances");
}

/** « Rouvrir l'offre 24 h » (deuxième chance demandée par le prospect) : prix réservé valable 24 h de plus. */
export async function reopenOffer(form: FormData) {
  await requireAdmin();
  const query = String(form.get("q") || "").slice(0, 120);
  const prospect = query ? await findProspectForReopen(query) : null;
  if (!prospect) redirect(`/admin/relances?rouvrir=introuvable#deuxieme-chance`);
  await reopenReservedOffer(prospect.id);
  revalidatePath("/admin/relances");
  redirect(`/admin/relances?rouvrir=${encodeURIComponent(prospect.id)}#deuxieme-chance`);
}

/** « Prévenir les acheteurs » : email du lien de l'extrait en ligne (une fois par acheteur, budget du jour respecté). */
export async function announceExtraitWeb(form: FormData) {
  await requireAdmin();
  const max = Math.min(Math.max(Number(form.get("max") || 0), 0), 80);
  const r = max ? await sendExtraitAnnounce(max) : null;
  revalidatePath("/admin/relances");
  redirect(`/admin/relances?annonce=${r ? `${r.sent}-${r.failed}` : "0-0"}#extrait-en-ligne`);
}
