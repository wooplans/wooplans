"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendUpsellCampaignBatch } from "@/lib/upsell-campaign";

/** Offre PROMO10 aux anciens acheteurs du plan et devis : un lot par clic, après confirmation. */
export async function sendUpsellCampaign(form: FormData) {
  await requireAdmin();
  if (form.get("confirm") !== "1") redirect("/admin/plan-devis?offre=confirmer");
  const r = await sendUpsellCampaignBatch();
  revalidatePath("/admin/plan-devis");
  redirect(`/admin/plan-devis?offre=ok&envoyes=${r.sent}&echecs=${r.failed}&restants=${r.remaining}`);
}
