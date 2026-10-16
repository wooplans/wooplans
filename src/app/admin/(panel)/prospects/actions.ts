"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import {
  importChariowProspects,
  saveProspectSettings,
  startProspectSequence,
  startSequenceForRecent,
  stopProspectSequence,
} from "@/lib/prospects";

async function notice(text: string) {
  (await cookies()).set("wp_notice", text, { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: 120 });
}

export async function importProspects() {
  await requireAdmin();
  const r = await importChariowProspects();
  await notice(`Import Chariow : ${r.scanned} paiements abandonnés ou échoués lus, ${r.added} nouveaux prospects (aucun email envoyé).`);
  revalidatePath("/admin/prospects");
}

export async function startRecent(form: FormData) {
  await requireAdmin();
  const days = Math.min(365, Math.max(1, Number(form.get("days") || 30)));
  const n = await startSequenceForRecent(days);
  await notice(`Relance démarrée pour ${n} prospect(s) des ${days} derniers jours : premier email dans les 15 minutes.`);
  revalidatePath("/admin/prospects");
}

export async function startOne(id: string) {
  await requireAdmin();
  const enabled = await startProspectSequence(id);
  await notice(enabled ? "Relance démarrée : premier email dans les 15 minutes." : "Relance programmée, mais les envois automatiques sont en pause (réglages ci-dessous).");
  revalidatePath("/admin/prospects");
}

export async function stopOne(id: string) {
  await requireAdmin();
  await stopProspectSequence(id, "open");
  revalidatePath("/admin/prospects");
}

export async function markLost(id: string) {
  await requireAdmin();
  await stopProspectSequence(id, "lost");
  revalidatePath("/admin/prospects");
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  const s = await saveProspectSettings({
    enabled: form.get("enabled") === "on",
    delaysHours: String(form.get("delays") || "")
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(Number),
    discountCode: String(form.get("discountCode") || ""),
    discountLabel: String(form.get("discountLabel") || ""),
    perRun: Number(form.get("perRun") || 25),
  });
  await notice(`Réglages enregistrés : ${s.enabled ? "envois actifs" : "envois en pause"}, ${s.delaysHours.length} emails (${s.delaysHours.join(" h, ")} h).`);
  revalidatePath("/admin/prospects");
}
