/**
 * Pipeline des acheteurs du guide (CRM) et séquence WhatsApp automatique (décision de Tao, 17 nov. 2026) :
 * J0 livraison du guide, J1 vidéo du catalogue, J3 témoignage + prix barré, puis classement à J4 :
 * client (a acheté), chaud (a cliqué ou répondu), tiède (a lu), froid (rien), désinscrit (STOP).
 * Les campagnes WhatsApp ciblent ensuite une étape du pipeline.
 */
import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import type { PipelineStage } from "@/db/schema";
import { isCustomer } from "@/lib/prospects";
import { classify } from "@/lib/whatsapp-rules";
import { sendCampaignOffer, sendGuideCatalogueVideo, sendGuideDelivery, sendGuideTestimonial, waEnabled, waNumber } from "@/lib/whatsapp";
import { LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";

const HOUR = 3_600_000;
/** Message refusé (modèle pas encore validé par Meta, coupure…) : nouvel essai 30 min plus tard, pendant 48 h au plus. */
const RETRY_MS = 30 * 60_000;
const RETRY_MAX_MS = 48 * HOUR;
/** Délais après le message précédent : J1 (24 h), J3 (48 h plus tard), classement à J4 (24 h plus tard). */
export const WA_DELAYS_HOURS = [24, 48, 24] as const;

export const STAGE_LABELS: Record<PipelineStage, string> = {
  sequence: "Séquence en cours",
  chaud: "Chaud",
  tiede: "Tiède",
  froid: "Froid",
  client: "Client catalogue",
  projet: "Projet plans complets",
  desinscrit: "Désinscrit",
};

/** J0 : livraison du guide sur WhatsApp, et entrée dans le pipeline (étape « séquence »). */
export async function startGuideWhatsapp(email: string, phone: string | null, name: string | null, intentId: string, offer: "guide" | "extrait" = "guide") {
  const db = getDb();
  const prospect = await db.query.prospects.findFirst({ where: eq(schema.prospects.email, email) });
  if (!prospect) {
    // Déjà membre du catalogue (aucune fiche prospect créée) : il apparaît quand même dans le pipeline, en « client ».
    const now = new Date();
    await db
      .insert(schema.prospects)
      .values({
        id: randomId(),
        email,
        name,
        phone,
        status: "converted",
        lastEvent: "guide",
        lastEventAt: now,
        source: "guide",
        sequenceKind: "guide",
        convertedAt: now,
        pipelineStage: "client",
        pipelineUpdatedAt: now,
      })
      .onConflictDoNothing();
    return "customer";
  }
  const to = waNumber(phone ?? prospect.phone);
  const now = new Date();
  if (!to || !waEnabled()) {
    await db.update(schema.prospects).set({ pipelineStage: "froid", pipelineUpdatedAt: now, updatedAt: now }).where(eq(schema.prospects.id, prospect.id));
    return to ? "disabled" : "no_phone";
  }
  const sent = await sendGuideDelivery(to, name ?? prospect.name, intentId, offer);
  if (!sent.ok) console.error("WhatsApp : livraison du guide non envoyée, nouvel essai dans 30 min", email, sent.error);
  await db
    .update(schema.prospects)
    .set({
      waStep: sent.ok ? 1 : 0,
      waLastSentAt: sent.ok ? now : null,
      waNextAt: new Date(now.getTime() + (sent.ok ? WA_DELAYS_HOURS[0] * HOUR : RETRY_MS)),
      waOptOutAt: null,
      pipelineStage: "sequence",
      pipelineUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.prospects.id, prospect.id));
  return sent.ok ? "sent" : "failed";
}

/** Tâche du cron (toutes les 15 min) : messages J1 et J3, puis classement à J4. */
export async function runWhatsappSequence(now = new Date(), limit = 40) {
  const db = getDb();
  const due = await db.query.prospects.findMany({
    where: and(eq(schema.prospects.pipelineStage, "sequence"), lte(schema.prospects.waNextAt, now)),
    limit,
  });
  const out = { sent: 0, failed: 0, classified: 0 };
  for (const p of due) {
    const customer = await isCustomer(p.email, p.phone);
    const to = waNumber(p.phone);
    if (customer || p.waOptOutAt || p.waStep >= 3 || !to || !waEnabled()) {
      const stage = classify(p, customer);
      await db.update(schema.prospects).set({ pipelineStage: stage, pipelineUpdatedAt: now, waNextAt: null, updatedAt: now }).where(eq(schema.prospects.id, p.id));
      out.classified++;
      continue;
    }
    let sent;
    if (p.waStep === 0) {
      const intent = await db.query.checkoutIntents.findFirst({
        where: and(eq(schema.checkoutIntents.email, p.email), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        columns: { id: true, ctaId: true },
      });
      sent = intent
        ? await sendGuideDelivery(to, p.name, intent.id, intent.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide")
        : ({ ok: false, error: "intent_not_found" } as const);
    } else sent = p.waStep === 1 ? await sendGuideCatalogueVideo(to, p.name, p.id) : await sendGuideTestimonial(to, p.id);
    if (!sent.ok) {
      console.error(`WhatsApp : message ${p.waStep + 1} non envoyé`, p.email, sent.error);
      out.failed++;
      // Nouvel essai dans 30 min tant que le retard reste sous 48 h ; au-delà, on passe au message suivant.
      const due = p.waStep === 0 || !p.waLastSentAt ? p.lastEventAt.getTime() : p.waLastSentAt.getTime() + WA_DELAYS_HOURS[p.waStep - 1] * HOUR;
      const late = now.getTime() - due;
      if (late < RETRY_MAX_MS) {
        await db.update(schema.prospects).set({ waNextAt: new Date(now.getTime() + RETRY_MS), updatedAt: now }).where(eq(schema.prospects.id, p.id));
        continue;
      }
    } else out.sent++;
    await db
      .update(schema.prospects)
      .set({
        waStep: p.waStep + 1,
        waLastSentAt: sent.ok ? now : p.waLastSentAt,
        waNextAt: new Date(now.getTime() + WA_DELAYS_HOURS[p.waStep] * HOUR),
        updatedAt: now,
      })
      .where(eq(schema.prospects.id, p.id));
  }
  return out;
}

/** Déplacement à la main depuis l'admin. Sortir de « séquence » arrête les messages automatiques. */
export async function moveToStage(id: string, stage: PipelineStage) {
  const now = new Date();
  await getDb()
    .update(schema.prospects)
    .set({ pipelineStage: stage, pipelineUpdatedAt: now, ...(stage === "sequence" ? {} : { waNextAt: null }), ...(stage === "desinscrit" ? { waOptOutAt: now } : {}), updatedAt: now })
    .where(eq(schema.prospects.id, id));
}

/** Clic sur un bouton d'un message (/r/<prospect>.<étape>) : la personne devient « chaude » après la séquence. */
export async function recordWhatsappClick(prospectId: string) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, prospectId), columns: { id: true, pipelineStage: true, waClickedAt: true } });
  if (!p) return false;
  const now = new Date();
  const promote = p.pipelineStage === "tiede" || p.pipelineStage === "froid";
  await db
    .update(schema.prospects)
    .set({ waClickedAt: p.waClickedAt ?? now, ...(promote ? { pipelineStage: "chaud" as const, pipelineUpdatedAt: now } : {}), updatedAt: now })
    .where(eq(schema.prospects.id, p.id));
  return true;
}

function phoneMatch(digits: string) {
  return or(eq(schema.prospects.phone, digits), eq(schema.prospects.phone, `+${digits}`));
}

/** Statut « lu » d'un message envoyé (webhook). */
export async function recordWhatsappRead(phoneDigits: string) {
  const now = new Date();
  await getDb()
    .update(schema.prospects)
    .set({ waReadAt: now, updatedAt: now })
    .where(and(phoneMatch(phoneDigits), isNull(schema.prospects.waReadAt)));
}

/** Message reçu du client (webhook) : réponse = intérêt (« chaud » après la séquence), « STOP » = désinscription. */
export async function recordWhatsappReply(phoneDigits: string, stop: boolean) {
  const db = getDb();
  const now = new Date();
  const rows = await db.query.prospects.findMany({ where: phoneMatch(phoneDigits), columns: { id: true, pipelineStage: true } });
  for (const p of rows) {
    if (stop) {
      await db.update(schema.prospects).set({ waOptOutAt: now, waNextAt: null, pipelineStage: "desinscrit", pipelineUpdatedAt: now, updatedAt: now }).where(eq(schema.prospects.id, p.id));
    } else {
      const promote = p.pipelineStage === "tiede" || p.pipelineStage === "froid";
      await db
        .update(schema.prospects)
        .set({ waRepliedAt: now, ...(promote ? { pipelineStage: "chaud" as const, pipelineUpdatedAt: now } : {}), updatedAt: now })
        .where(eq(schema.prospects.id, p.id));
    }
  }
  return rows.length;
}

export type WaCampaign = { label: string; template: string; image: string; code: string; stages: PipelineStage[] };

/** Destinataires d'une campagne : étapes visées, avec numéro, pas désinscrits, pas déjà touchés par cette campagne. */
export async function campaignAudience(key: string, c: WaCampaign) {
  const rows = await getDb().query.prospects.findMany({
    where: inArray(schema.prospects.pipelineStage, c.stages),
    columns: { id: true, name: true, phone: true, waOptOutAt: true, waCampaign: true },
  });
  return rows.filter((p) => waNumber(p.phone) && !p.waOptOutAt && p.waCampaign !== key);
}

/** Envoi d'une campagne (après confirmation de Tao dans l'admin). */
export async function launchCampaign(key: string, c: WaCampaign, deadline: string, limit = 300) {
  const db = getDb();
  const audience = (await campaignAudience(key, c)).slice(0, limit);
  const out = { sent: 0, failed: 0, errors: [] as string[] };
  for (const p of audience) {
    const sent = await sendCampaignOffer(waNumber(p.phone)!, c, p.name, p.id, key, deadline, c.code);
    if (sent.ok) {
      out.sent++;
      await db.update(schema.prospects).set({ waCampaign: key, waCampaignAt: new Date(), updatedAt: new Date() }).where(eq(schema.prospects.id, p.id));
    } else {
      out.failed++;
      if (out.errors.length < 3) out.errors.push(sent.error);
    }
  }
  return out;
}
