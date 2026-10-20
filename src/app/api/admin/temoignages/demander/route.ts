import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { whatsappUrl } from "@/lib/phone";
import { testimonialRequestMessage } from "@/lib/testimonial-request";

/**
 * Bouton « Demander sur WhatsApp » de l'admin : note la demande sur le membre, puis ouvre WhatsApp
 * vers son numéro avec le message prérempli (prénom + lien de la page /temoignage).
 */
export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) return Response.redirect(siteUrl("/admin/connexion"), 302);
  const memberId = new URL(request.url).searchParams.get("member") || "";
  const member = await getDb().query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member) return new Response("Membre introuvable", { status: 404 });
  const message = testimonialRequestMessage({ name: member.name, link: siteUrl("/temoignage"), relaunch: member.testimonialAskCount > 0 });
  const url = whatsappUrl(member.phone, message);
  if (!url) return new Response("Numéro WhatsApp inexploitable pour ce membre", { status: 400 });
  await getDb()
    .update(schema.members)
    .set({ testimonialAskedAt: new Date(), testimonialAskCount: sql`${schema.members.testimonialAskCount} + 1` })
    .where(eq(schema.members.id, member.id));
  return Response.redirect(url, 302);
}
