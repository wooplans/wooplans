"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { correctWhatsappNumber, markNoWhatsapp, undoManualSend } from "@/lib/relances";

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
