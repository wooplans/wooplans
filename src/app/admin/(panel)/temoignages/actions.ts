"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";

/** URL publique (« /media/… ») du message audio affiché sur /temoignage ; vide = retiré. */
export async function saveIntroAudio(url: string) {
  await requireAdmin();
  if (url && !url.startsWith("/media/")) throw new Error("Fichier invalide");
  await setSetting("testimonial_intro_audio", url);
  revalidatePath("/admin/temoignages");
  revalidatePath("/temoignage");
}

/** Avis reçu (vocal WhatsApp) : arrête les demandes d'avis par email pour ce membre. */
export async function markTestimonialReceived(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("member") || "");
  if (!memberId) return;
  await getDb()
    .update(schema.members)
    .set({ testimonialReceivedAt: new Date(), afterSaleNextAt: null, updatedAt: new Date() })
    .where(eq(schema.members.id, memberId));
  revalidatePath("/admin/temoignages");
}
