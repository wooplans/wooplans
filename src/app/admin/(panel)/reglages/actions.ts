"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveEmailBudget } from "@/lib/email-budget";
import { normalizeCostSettings } from "@/lib/plan-pricing";
import { recomputeAllPlans } from "@/lib/plan-recompute";
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

export async function saveBudget(form: FormData) {
  await requireAdmin();
  const n = (name: string) => Math.max(0, Math.round(Number(form.get(name) || 0)));
  await saveEmailBudget({ dailyLimit: n("dailyLimit"), monthlyLimit: n("monthlyLimit"), dailyReserve: n("dailyReserve") });
  revalidatePath("/admin/reglages");
}

/** Prix au m² et coefficients de standing : enregistrés puis appliqués à tous les modèles. */
export async function saveCostSettings(form: FormData) {
  await requireAdmin();
  const num = (name: string) => {
    const v = Number(String(form.get(name) ?? "").replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) throw new Error(`Valeur invalide pour « ${name} » : nombre positif attendu.`);
    return v;
  };
  const settings = normalizeCostSettings({
    ratePerM2: { villa: Math.round(num("rateVilla")), duplex: Math.round(num("rateDuplex")) },
    standingCoef: { bas: num("coefBas"), standard: num("coefStandard"), eleve: num("coefEleve") },
  });
  await setSetting("cost_settings", settings);
  await recomputeAllPlans(settings);
  revalidatePath("/", "layout");
}
