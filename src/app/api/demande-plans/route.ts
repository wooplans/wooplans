import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE } from "@/lib/session";
import { recordServerEvent } from "@/lib/tracking";

type Body = { name?: string; phone?: string; email?: string; city?: string; plan?: string; details?: string };

/** Demande de plans complets depuis le site : crée une fiche dans le CRM. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name || "").trim().slice(0, 120);
  const phone = (body.phone || "").trim().slice(0, 40);
  if (name.length < 2 || phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json({ error: "Indiquez votre nom et un numéro WhatsApp." }, { status: 400 });
  }
  if (!(await rateLimit(`lead:${clientIp(request.headers)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }

  const db = getDb();
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  const email = body.email ? normalizeEmail(body.email) : null;
  const member = email ? await db.query.members.findFirst({ where: eq(schema.members.email, email) }) : null;
  const planLabel = (body.plan || "").trim().slice(0, 120) || null;
  const plan = planLabel
    ? await db.query.plans.findFirst({ where: eq(schema.plans.code, planLabel.toUpperCase()) })
    : null;

  const leadId = randomId();
  await db.insert(schema.leads).values({
    id: leadId,
    name,
    phone,
    email,
    city: (body.city || "").trim().slice(0, 120) || null,
    memberId: member?.id ?? null,
    planId: plan?.id ?? null,
    planLabel,
    channel: "site",
    stage: "demande",
    projectDetails: (body.details || "").trim().slice(0, 4000),
    catalogueCredit: member ? Number(getEnv().CATALOGUE_PRICE_XAF || 39000) : 0,
    nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    utmSource: visitor?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? null,
  });
  await db.insert(schema.leadActivities).values({
    id: randomId(),
    leadId,
    kind: "note",
    body: "Demande reçue via le formulaire du site.",
    author: "site",
  });
  if (visitorId) await recordServerEvent({ visitorId, type: "custom_plan_request", path: "/plans-personnalises" }).catch(() => {});

  const notify = getEnv().ADMIN_NOTIFY_EMAIL;
  if (notify) {
    const subject = `Nouvelle demande de plans complets : ${name}`;
    await sendEmail({
      to: notify,
      subject,
      template: "admin_lead",
      leadId,
      text: `${subject}\nTéléphone : ${phone}\nModèle : ${planLabel || "—"}\n${siteUrl(`/admin/crm/${leadId}`)}`,
      html: `<p><strong>${subject}</strong></p><p>Téléphone : ${phone}<br>Modèle : ${planLabel || "—"}</p><p><a href="${siteUrl(`/admin/crm/${leadId}`)}">Ouvrir dans le CRM</a></p>`,
    });
  }
  return NextResponse.json({ ok: true });
}
