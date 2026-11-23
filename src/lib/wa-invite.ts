import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sendEmail, whatsappInviteEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { LEAD_CTA_IDS, LEAD_OFFERS, WHATSAPP_BUSINESS_NUMBER } from "@/lib/lead-offers";
import { merciWhatsappText, orderCode } from "@/lib/order-code";
import { whatsappLink } from "@/lib/site";
import { inChunks } from "@/lib/sql-chunks";

/**
 * Invitation à écrire sur WhatsApp (décision de Tao, 23 nov. 2026) : l'entrée dans WhatsApp est la porte du tunnel.
 * Un email avec le bouton vert (message pré-rempli avec le code de commande, qui rattache le numéro à la fiche) part
 * une seule fois aux acheteurs de l'extrait ou du guide qui ne nous ont jamais écrit, 45 min après l'achat.
 * Exclus : ceux qui ont déjà écrit (webhook WhatsApp), les clients du catalogue, les désinscrits.
 * Tourne dans la tâche des 15 minutes ; le premier passage rattrape aussi les acheteurs d'avant.
 */
export const WA_INVITE_TEMPLATE = "wa_invite";
export const WA_INVITE_DELAY_MS = 45 * 60_000;

export async function sendWaInvites(limit = 50, now = new Date()) {
  const db = getDb();
  const intents = await db.query.checkoutIntents.findMany({
    where: and(inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid"), lte(schema.checkoutIntents.createdAt, new Date(now.getTime() - WA_INVITE_DELAY_MS))),
    orderBy: desc(schema.checkoutIntents.createdAt),
    columns: { id: true, email: true, ctaId: true },
  });
  // Dernier achat par email.
  const latest = new Map<string, (typeof intents)[number]>();
  for (const i of intents) {
    const email = (i.email || "").trim().toLowerCase();
    if (email && !latest.has(email)) latest.set(email, i);
  }
  const emails = [...latest.keys()];
  if (!emails.length) return { candidates: 0, sent: 0 };
  const [prospects, logs] = await Promise.all([
    inChunks(emails, (chunk) =>
      db.query.prospects.findMany({
        where: inArray(sql`lower(${schema.prospects.email})`, chunk),
        columns: { email: true, name: true, waRepliedAt: true, lastInboundAt: true, convertedAt: true, waOptOutAt: true },
      }),
    ),
    inChunks(emails, (chunk) =>
      db.query.emailLog.findMany({
        where: and(eq(schema.emailLog.template, WA_INVITE_TEMPLATE), inArray(sql`lower(${schema.emailLog.to})`, chunk)),
        columns: { to: true, status: true },
      }),
    ),
  ]);
  const byEmail = new Map(prospects.map((p) => [p.email.toLowerCase(), p]));
  const done = new Set(logs.filter((l) => l.status !== "failed").map((l) => l.to.toLowerCase()));
  let sent = 0;
  let candidates = 0;
  for (const [email, intent] of latest) {
    const p = byEmail.get(email);
    if (done.has(email) || p?.waRepliedAt || p?.lastInboundAt || p?.convertedAt || p?.waOptOutAt) continue;
    candidates++;
    if (sent >= limit) continue;
    const extrait = intent.ctaId === LEAD_OFFERS.extrait.ctaId;
    const product = extrait ? "l'Extrait du Catalogue Premium" : "le Guide WooPlans des maisons";
    const mail = whatsappInviteEmail({
      name: p?.name,
      offer: extrait ? "extrait" : "guide",
      whatsappUrl: whatsappLink(merciWhatsappText({ product, code: orderCode(intent.id), name: p?.name }), WHATSAPP_BUSINESS_NUMBER),
      fallbackUrl: extrait ? siteUrl(`/mon-extrait/${intent.id}`) : siteUrl(`/api/guide/${intent.id}`),
    });
    await sendEmail({ to: email, ...mail, template: WA_INVITE_TEMPLATE });
    sent++;
  }
  return { candidates, sent };
}
