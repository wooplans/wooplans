"use server";

import { revalidatePath } from "next/cache";
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
