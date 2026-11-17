"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { PIPELINE_STAGES, type PipelineStage } from "@/db/schema";
import { cookies } from "next/headers";
import campaigns from "@/config/wa-campaigns.json";
import { launchCampaign, moveToStage, type WaCampaign } from "@/lib/pipeline";

export async function moveProspect(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const stage = String(form.get("stage") || "") as PipelineStage;
  if (!id || !PIPELINE_STAGES.includes(stage)) return;
  await moveToStage(id, stage);
  revalidatePath("/admin/pipeline");
}

/** Envoi d'une campagne WhatsApp : seulement après confirmation explicite (case cochée) et une date limite écrite. */
export async function sendCampaign(form: FormData) {
  await requireAdmin();
  const key = String(form.get("campaign") || "");
  const c = (campaigns as Record<string, WaCampaign>)[key];
  const deadline = String(form.get("deadline") || "").trim().slice(0, 60);
  const store = await cookies();
  const notice = (text: string) => store.set("wp_notice", text, { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: 120 });
  if (!c || !deadline || form.get("confirm") !== "oui") {
    notice("Campagne non envoyée : écrivez la date limite et cochez la confirmation.");
  } else {
    const r = await launchCampaign(key, c, deadline);
    notice(`Campagne « ${c.label} » : ${r.sent} message(s) envoyé(s), ${r.failed} échec(s)${r.errors.length ? ` (${r.errors.join(" ; ")})` : ""}.`);
  }
  revalidatePath("/admin/pipeline");
}
