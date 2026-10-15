"use server";

import { normalizePhone } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { accessCodeEmail, sendEmail } from "@/lib/email";
import { grantAccess, revokeAccess, rotateAccessCode } from "@/lib/members";

/** Le code en clair est montré une seule fois à l'admin via un cookie éphémère. */
async function flashCode(email: string, code: string, emailed: boolean) {
  (await cookies()).set("wp_flash", JSON.stringify({ email, code, emailed }), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 120,
  });
}

export async function addMember(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide");
  const name = String(form.get("name") || "").trim();
  const { member, code } = await grantAccess({ email, name, phone: normalizePhone(String(form.get("phone") || "")), source: "manual" });
  let emailed = false;
  if (form.get("sendEmail") === "on") {
    const mail = accessCodeEmail({ name, email, code });
    emailed = (await sendEmail({ to: email, ...mail, template: "access_code", memberId: member.id })).ok;
  }
  await flashCode(email, code, emailed);
  revalidatePath("/admin/membres");
}

export async function newCode(memberId: string) {
  await requireAdmin();
  const { member, code } = await rotateAccessCode(memberId);
  const mail = accessCodeEmail({ name: member.name, email: member.email, code, isNewCode: true });
  const emailed = (await sendEmail({ to: member.email, ...mail, template: "access_code_reset", memberId })).ok;
  await flashCode(member.email, code, emailed);
  revalidatePath("/admin/membres");
}

export async function revoke(memberId: string, form: FormData) {
  await requireAdmin();
  await revokeAccess(memberId, String(form.get("reason") || "Révoqué par l'admin"));
  revalidatePath("/admin/membres");
}

export async function reactivate(memberId: string) {
  await requireAdmin();
  const member = await getDb().query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member) return;
  const { code } = await grantAccess({ email: member.email, source: member.source });
  const mail = accessCodeEmail({ name: member.name, email: member.email, code, isNewCode: true });
  const emailed = (await sendEmail({ to: member.email, ...mail, template: "access_code_reset", memberId })).ok;
  await flashCode(member.email, code, emailed);
  revalidatePath("/admin/membres");
}

export async function importFromChariow() {
  await requireAdmin();
  const { importChariowBuyers } = await import("@/lib/chariow-import");
  const result = await importChariowBuyers();
  (await cookies()).set("wp_notice", `Import Chariow : ${result.scanned} ventes lues, ${result.salesAdded} ventes ajoutées, ${result.membersAdded} membres créés, ${result.phonesAdded} numéros WhatsApp complétés.`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 120,
  });
  revalidatePath("/admin/membres");
}

export async function sendLegacyCodes() {
  await requireAdmin();
  const { sendLegacyWelcomeBatch } = await import("@/lib/chariow-import");
  const result = await sendLegacyWelcomeBatch(25);
  (await cookies()).set("wp_notice", `Codes envoyés : ${result.sent}/${result.attempted}. Restant à envoyer : ${result.remaining}.`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 120,
  });
  revalidatePath("/admin/membres");
}
