import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { guideHotLeadAdminEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { GUIDE_CTA_ID, heardFromLabel, isHotLead, parseQualification, qualificationSummary } from "@/lib/guide";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { whatsappLink } from "@/lib/site";

type Body = { i?: string; terrain?: string; start?: string; budget?: string };

/**
 * 3 questions de la page de remerciement du guide. Terrain + démarrage dans les 6 mois : fiche CRM « demande »
 * et alerte au propriétaire (Tao écrit lui-même sur WhatsApp). Les autres restent dans la séquence d'emails.
 */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`guide-q:${clientIp(request.headers)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Body;
  const q = parseQualification(body);
  if (!q || !body.i) return NextResponse.json({ error: "Merci de répondre aux 3 questions." }, { status: 400 });

  const db = getDb();
  const intent = await db.query.checkoutIntents.findFirst({ where: eq(schema.checkoutIntents.id, body.i.slice(0, 64)) });
  if (!intent || intent.ctaId !== GUIDE_CTA_ID || intent.status !== "paid") {
    return NextResponse.json({ error: "Achat introuvable ou paiement non confirmé." }, { status: 404 });
  }
  // Une seule réponse par achat (pas de doublon dans le CRM).
  const saved = await db
    .update(schema.checkoutIntents)
    .set({ qualification: JSON.stringify(q), updatedAt: new Date() })
    .where(and(eq(schema.checkoutIntents.id, intent.id), isNull(schema.checkoutIntents.qualification)))
    .returning({ id: schema.checkoutIntents.id });
  const hot = isHotLead(q);
  if (saved.length === 0) return NextResponse.json({ ok: true, hot });

  const sale = intent.saleId ? await db.query.sales.findFirst({ where: eq(schema.sales.chariowSaleId, intent.saleId) }) : null;
  const email = intent.email || sale?.email || "";
  const summary = `${qualificationSummary(q)}${intent.heardFrom ? ` Nous a connus par : ${heardFromLabel(intent.heardFrom)}.` : ""}`;

  if (email) {
    const prospect = await db.query.prospects.findFirst({ where: eq(schema.prospects.email, email), columns: { id: true, notes: true } });
    if (prospect) {
      const line = `${new Date().toISOString().slice(0, 10)} : guide, ${summary}`;
      await db
        .update(schema.prospects)
        .set({ notes: prospect.notes ? `${prospect.notes}\n${line}` : line, updatedAt: new Date() })
        .where(eq(schema.prospects.id, prospect.id));
    }
  }

  if (hot) {
    const leadId = randomId();
    await db.insert(schema.leads).values({
      id: leadId,
      name: sale?.name || email || "Acheteur du guide",
      phone: sale?.phone ?? null,
      email: email || null,
      country: sale?.country ?? null,
      channel: "site",
      stage: "demande",
      projectDetails: `Guide des maisons acheté. ${summary}`,
      landDetails: q.terrain === "titre" ? "Terrain avec titre foncier" : "Terrain sans titre ou titre en cours",
      catalogueCredit: 0,
      nextFollowUpAt: new Date(),
      utmSource: sale?.utmSource ?? null,
      utmCampaign: sale?.utmCampaign ?? null,
    });
    await db.insert(schema.leadActivities).values({
      id: randomId(),
      leadId,
      kind: "note",
      body: `Lead chaud (guide des maisons) : ${summary} À contacter sur WhatsApp.`,
      author: "site",
    });
    const notify = getEnv().ADMIN_NOTIFY_EMAIL;
    if (notify && email) {
      const phone = sale?.phone ? sale.phone.replace(/\D/g, "") : null;
      const first = (sale?.name || "").split(" ")[0];
      const mail = guideHotLeadAdminEmail({
        name: sale?.name ?? null,
        email,
        phone: sale?.phone ?? null,
        summary,
        whatsappUrl: phone ? whatsappLink(`Bonjour${first ? ` ${first}` : ""}, c'est Tao de WooPlans. Merci pour votre achat du Guide des maisons ! Vous avez un terrain et vous voulez démarrer bientôt : quel modèle vous plaît le plus ?`, phone) : null,
      });
      await sendEmail({ to: notify, ...mail, template: "guide_lead_chaud", leadId });
    }
  }
  return NextResponse.json({ ok: true, hot });
}
