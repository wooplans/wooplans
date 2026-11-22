"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { addExpense, deleteExpense } from "@/lib/profit";

/** Dépense ponctuelle (crédits ElevenLabs, Poyo…), en FCFA ou en dollars (converti à 750 FCFA). */
export async function saveExpense(form: FormData) {
  await requireAdmin();
  const date = String(form.get("date") || "");
  const amount = Number(String(form.get("amount") || "").replace(",", "."));
  const currency = form.get("currency") === "USD" ? "USD" : "XAF";
  const category = String(form.get("category") || "autre").slice(0, 30);
  const label = String(form.get("label") || category).trim() || category;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && amount > 0) await addExpense({ date, category, label, amount, currency });
  revalidatePath("/admin/gains");
}

export async function removeExpense(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (id) await deleteExpense(id);
  revalidatePath("/admin/gains");
}
