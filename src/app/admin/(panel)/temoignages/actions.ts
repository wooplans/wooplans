"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { setSetting } from "@/lib/settings";
import { cleanText } from "@/lib/testimonial-request";

const STATUSES = ["new", "kept", "rejected"] as const;

export async function setTestimonialStatus(id: string, status: (typeof STATUSES)[number]) {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Statut invalide");
  await getDb().update(schema.testimonialSubmissions).set({ status }).where(eq(schema.testimonialSubmissions.id, id));
  revalidatePath("/admin/temoignages");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  const row = await getDb().query.testimonialSubmissions.findFirst({ where: eq(schema.testimonialSubmissions.id, id) });
  if (!row) return;
  await getEnv().VIDEOS.delete(row.mediaKey);
  await getDb().delete(schema.testimonialSubmissions).where(eq(schema.testimonialSubmissions.id, id));
  revalidatePath("/admin/temoignages");
}

export async function saveTestimonialReward(form: FormData) {
  await requireAdmin();
  await setSetting("testimonial_reward", cleanText(String(form.get("reward") || ""), 200));
  revalidatePath("/admin/temoignages");
}
