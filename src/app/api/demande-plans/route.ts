import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { customPlanOffer } from "@/lib/custom-plans";
import { sendEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import {
  parsePlanRequestAnswers,
  planRequestRef,
  planRequestScore,
  planRequestSummary,
  planRequestTier,
  planRequestWhatsappText,
  TIER_LABELS,
} from "@/lib/plan-request-rules";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE } from "@/lib/session";
import { whatsappLink } from "@/lib/site";
import { recordServerEvent } from "@/lib/tracking";

type Body = Record<string, unknown> & {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  plan?: string;
  details?: string;
  confirm?: unknown;
};

/**
 * Demande de plans complets (formulaire de qualification, 23 nov. 2026) : fiche CRM notée sur 100, alerte à Tao,
 * puis le client est envoyé sur WhatsApp avec un message pré-rempli (lien renvoyé dans la réponse).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim().slice(0, 40);
  if (name.length < 2 || phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json({ error: "Indiquez votre nom et un numéro WhatsApp." }, { status: 400 });
  }
  const answers = parsePlanRequestAnswers(body);
  if (!answers) return NextResponse.json({ error: "Merci de répondre à toutes les questions." }, { status: 400 });
  if (body.confirm !== true && body.confirm !== "on" && body.confirm !== "true") {
    return NextResponse.json({ error: "Merci de confirmer vos informations." }, { status: 400 });
  }
  if (!(await rateLimit(`lead:${clientIp(request.headers)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }

  const db = getDb();
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitor = visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, visitorId) }) : null;
  const email = body.email ? normalizeEmail(String(body.email)) : null;
  const member = email ? await db.query.members.findFirst({ where: eq(schema.members.email, email) }) : null;
  const planLabel = String(body.plan || "").trim().toUpperCase().slice(0, 120) || null;
  const plan = planLabel ? await db.query.plans.findFirst({ where: eq(schema.plans.code, planLabel) }) : null;
  const city = String(body.city || "").trim().slice(0, 120) || null;
  const details = String(body.details || "").trim().slice(0, 4000);

  const score = planRequestScore(answers);
  const tier = planRequestTier(score);
  const summary = planRequestSummary(answers);
  const offer = customPlanOffer(answers.type === "duplex" ? "duplex" : "villa");

  const leadId = randomId();
  const ref = planRequestRef(leadId);
  await db.insert(schema.leads).values({
    id: leadId,
    name,
    phone,
    email,
    city,
    memberId: member?.id ?? null,
    planId: plan?.id ?? null,
    planLabel,
    channel: "site",
    stage: "demande",
    projectDetails: `Demande ${ref} · Note ${score}/100 (${TIER_LABELS[tier]}) · ${summary}${details ? `\n${details}` : ""}`,
    landDetails: answers.terrain === "titre" ? "Terrain avec titre foncier" : answers.terrain === "sans_titre" ? "Terrain sans titre ou titre en cours" : "",
    agreedPrice: offer?.price ?? null,
    catalogueCredit: 0,
    // Chaud : relance due tout de suite (en haut de /admin/relances) ; sinon le lendemain.
    nextFollowUpAt: new Date(Date.now() + (tier === "chaud" ? 0 : 24 * 60 * 60 * 1000)),
    utmSource: visitor?.utmSource ?? null,
    utmCampaign: visitor?.utmCampaign ?? null,
  });
  await db.insert(schema.leadActivities).values({
    id: randomId(),
    leadId,
    kind: "note",
    body: `Formulaire de qualification des plans complets : note ${score}/100 (${TIER_LABELS[tier]}). ${summary}. Client renvoyé sur WhatsApp.`,
    author: "site",
  });
  if (visitorId) await recordServerEvent({ visitorId, type: "custom_plan_request", path: "/plans-personnalises" }).catch(() => {});

  const notify = getEnv().ADMIN_NOTIFY_EMAIL;
  if (notify) {
    const subject = `${tier === "chaud" ? "🔥 " : ""}Plans complets ${ref} : ${name} (${score}/100, ${TIER_LABELS[tier]})`;
    const crmUrl = siteUrl(`/admin/crm/${leadId}`);
    await sendEmail({
      to: notify,
      subject,
      template: "admin_lead",
      leadId,
      text: `${subject}\nTéléphone : ${phone}\nModèle : ${planLabel || "—"}\nVille : ${city || "—"}\n${summary}\n${crmUrl}`,
      html: `<p><strong>${escapeHtml(subject)}</strong></p><p>Téléphone : ${escapeHtml(phone)}<br>Modèle : ${escapeHtml(planLabel || "—")}<br>Ville : ${escapeHtml(city || "—")}</p><p>${escapeHtml(summary)}</p><p><a href="${crmUrl}">Ouvrir dans le CRM</a></p>`,
    }).catch(() => {});
  }

  const whatsappUrl = whatsappLink(planRequestWhatsappText({ ref, name, answers, plan: planLabel, city }));
  return NextResponse.json({ ok: true, ref, whatsappUrl });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
