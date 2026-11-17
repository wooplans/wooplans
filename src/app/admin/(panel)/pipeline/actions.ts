"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { PIPELINE_STAGES, type PipelineStage } from "@/db/schema";
import { moveToStage } from "@/lib/pipeline";

export async function moveProspect(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const stage = String(form.get("stage") || "") as PipelineStage;
  if (!id || !PIPELINE_STAGES.includes(stage)) return;
  await moveToStage(id, stage);
  revalidatePath("/admin/pipeline");
}
