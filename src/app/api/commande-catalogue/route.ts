import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { renderSVG } from "uqr";
import physical from "@/config/catalogue-physique.json";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getEnv, runInBackground, siteUrl } from "@/lib/env";
import { type OrderBody, isDeliveryCity, orderMessage, orderRef, parseOrder, shortOrderMessage, PROJECTS, TIMINGS, whatsappUrl } from "@/lib/physical-page";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

/** Libellé du modèle dans le CRM : distingue ces commandes des demandes de plans complets. */
const PHYSICAL_LABEL = "Catalogue imprimé";

/**
 * Commande du Catalogue Premium imprimé (/catalogue-physique) : le formulaire crée une fiche dans le CRM
 * (relance possible même si le prospect n'envoie pas son message), puis renvoie le message WhatsApp prérempli
 * et son QR code (visiteur sur ordinateur : il le scanne avec son téléphone).
 */
export async function POST(request: NextRequest) {
  const parsed = parseOrder(((await request.json().catch(() => null)) ?? {}) as OrderBody);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const order = parsed.order;
  if (!(await rateLimit(`physique:${clientIp(request.headers)}`, 6, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de demandes. Écrivez-nous directement sur WhatsApp." }, { status: 429 });
  }

  const db = getDb();
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  const leadId = randomId();
  const ref = orderRef(leadId);
  const message = orderMessage(order, ref, physical.price, physical.models);
  const details = [
    `Commande ${ref} : Catalogue Premium imprimé × ${order.quantity} (${(physical.price * order.quantity).toLocaleString("fr-FR")} FCFA affichés)`,
    `Livraison : ${order.city}, ${order.district}${isDeliveryCity(order.city) ? " (livraison gratuite)" : " (expédition)"}`,
    `Projet : ${PROJECTS[order.project]}, construction ${TIMINGS[order.timing]}`,
  ].join("\n");

  await db.insert(schema.leads).values({
    id: leadId,
    name: order.name,
    phone: `+237${order.phone}`,
    country: "CM",
    city: order.city,
    planLabel: PHYSICAL_LABEL,
    channel: "site",
    stage: "demande",
    projectDetails: details,
    budget: physical.price * order.quantity,
    nextFollowUpAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    utmSource: visitor?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? null,
  });
  await db.insert(schema.leadActivities).values({
    id: randomId(),
    leadId,
    kind: "note",
    body: `Commande du catalogue imprimé via /catalogue-physique (formulaire rempli, message WhatsApp prérempli ${ref}).`,
    author: "site",
  });

  runInBackground(
    (async () => {
      if (visitorId) await recordServerEvent({ visitorId, type: "physical_order", path: "/catalogue-physique" }).catch(() => {});
      const notify = getEnv().ADMIN_NOTIFY_EMAIL;
      if (!notify) return;
      const subject = `Commande catalogue imprimé ${ref} : ${order.name} (${order.city})`;
      const link = siteUrl(`/admin/crm/${leadId}`);
      await sendEmail({
        to: notify,
        subject,
        template: "admin_lead",
        leadId,
        text: `${subject}\nWhatsApp : +237 ${order.phone}\n${details}\n${link}`,
        html: `<p><strong>${subject}</strong></p><p>WhatsApp : +237 ${order.phone}<br>${details.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p><p><a href="${link}">Ouvrir dans le CRM</a></p>`,
      });
    })().catch((error) => console.error("Commande catalogue imprimé : notification", error)),
  );

  const url = whatsappUrl(message, physical.whatsapp);
  return NextResponse.json({
    ok: true,
    ref,
    whatsappUrl: url,
    message,
    qrSvg: renderSVG(whatsappUrl(shortOrderMessage(order, ref, physical.price), physical.whatsapp), { ecc: "M", border: 2 }),
    value: physical.price * order.quantity,
  });
}
