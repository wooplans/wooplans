"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { undoManualSend } from "@/lib/relances";

/** « Pas envoyé » : le message revient dans la file du jour. */
export async function undoRelance(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (id) await undoManualSend(id);
  revalidatePath("/admin/relances");
}
