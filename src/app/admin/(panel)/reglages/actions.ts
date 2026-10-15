"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setSetting, type CustomPlanPricing } from "@/lib/settings";

export async function savePricing(form: FormData) {
  await requireAdmin();
  const raw = String(form.get("pricing") || "");
  let parsed: CustomPlanPricing;
  try {
    parsed = JSON.parse(raw) as CustomPlanPricing;
  } catch {
    throw new Error("JSON invalide : vérifiez les virgules et guillemets.");
  }
  if (!Array.isArray(parsed.offers) || !Array.isArray(parsed.notes)) throw new Error("Structure attendue : { offers: [...], notes: [...] }");
  await setSetting("custom_plan_pricing", parsed);
  revalidatePath("/plans-personnalises");
  revalidatePath("/admin/reglages");
}

export async function saveCatalogueFiles(form: FormData) {
  await requireAdmin();
  const keys = JSON.parse(String(form.get("files") || "[]")) as string[];
  const label = String(form.get("label") || "Catalogue Premium WOOPLANS (PDF)");
  const files = keys.map((key, i) => ({
    key,
    label: keys.length > 1 ? `${label} — partie ${i + 1}` : label,
    updatedAt: new Date().toISOString(),
  }));
  await setSetting("catalogue_files", files);
  revalidatePath("/admin/reglages");
  revalidatePath("/espace-premium/telechargements");
}
