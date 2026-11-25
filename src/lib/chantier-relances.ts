import { eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { relanceCards, type RelanceRow } from "@/lib/chantier-relances-rules";

/**
 * Données de l'onglet « Plans complets » : chaque dossier lié à WhatsApp, avec ses derniers messages reçus et envoyés.
 * Règles de tri et d'affichage : src/lib/chantier-relances-rules.ts.
 */
export async function chantierRelances(now = new Date()) {
  const db = getDb();
  const cr = schema.chantierRequests;
  const wa = schema.waMessages;
  const lastIn = sql<number | null>`(select max(${wa.sentAt}) from ${wa} where '+' || ${wa.phone} = ${cr.phone} and ${wa.direction} = 'in')`;
  const lastOut = sql<number | null>`(select max(${wa.sentAt}) from ${wa} where '+' || ${wa.phone} = ${cr.phone} and ${wa.direction} = 'out')`;
  const rows = await db
    .select({
      id: cr.id,
      code: cr.code,
      name: cr.name,
      phone: cr.phone,
      country: cr.country,
      city: cr.city,
      profile: cr.profile,
      houseType: cr.houseType,
      bedrooms: cr.bedrooms,
      start: cr.start,
      utmContent: cr.utmContent,
      leadId: cr.leadId,
      aiStep: cr.aiStep,
      aiLand: cr.aiLand,
      aiLandDetails: cr.aiLandDetails,
      aiRelief: cr.aiRelief,
      aiSummary: cr.aiSummary,
      aiNextAction: cr.aiNextAction,
      aiMessageId: cr.aiMessageId,
      aiFollowUp: cr.aiFollowUp,
      aiUpdatedAt: sql<number | null>`${cr.aiUpdatedAt}`,
      clickedAt: sql<number | null>`${cr.relanceClickedAt}`,
      lastIn,
      lastOut,
      leadStage: schema.leads.stage,
    })
    .from(cr)
    .innerJoin(schema.leads, eq(schema.leads.id, cr.leadId))
    .where(isNotNull(cr.phone));
  const base = rows.map((r) => ({ ...r, lastIn: r.lastIn == null ? null : Number(r.lastIn), lastOut: r.lastOut == null ? null : Number(r.lastOut) }));
  const cards = relanceCards(base as (RelanceRow & (typeof base)[number])[], now.getTime()) as ((typeof base)[number] & ReturnType<typeof relanceCards>[number])[];
  // Dernier message reçu, pour le contexte des cartes « a écrit ».
  const lastTexts = new Map<string, string>();
  for (const c of cards.filter((x) => x.waiting).slice(0, 60)) {
    const m = await db.query.waMessages.findFirst({
      where: sql`'+' || ${wa.phone} = ${c.phone} and ${wa.direction} = 'in'`,
      orderBy: sql`${wa.sentAt} desc`,
      columns: { type: true, body: true, transcript: true },
    });
    if (m) lastTexts.set(c.id, m.transcript ? `🎤 ${m.transcript}` : m.body ? m.body : `[${m.type}]`);
  }
  return { cards, lastTexts };
}

export async function markRelanceClicked(id: string, now = new Date()) {
  await getDb().update(schema.chantierRequests).set({ relanceClickedAt: now }).where(eq(schema.chantierRequests.id, id));
}
