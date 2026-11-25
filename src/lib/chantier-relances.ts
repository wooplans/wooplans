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
      projectNote: cr.projectNote,
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
      aiAwaiting: cr.aiAwaiting,
      aiUpdatedAt: sql<number | null>`${cr.aiUpdatedAt}`,
      clickedAt: sql<number | null>`${cr.relanceClickedAt}`,
      lastIn,
      lastOut,
      leadStage: schema.leads.stage,
    })
    .from(cr)
    .innerJoin(schema.leads, eq(schema.leads.id, cr.leadId))
    .where(isNotNull(cr.phone));
  const base = rows.map((r) => ({ ...r, lastIn: r.lastIn == null ? null : Number(r.lastIn), lastOut: r.lastOut == null ? null : Number(r.lastOut), lastInText: null as string | null }));
  // Dernier message reçu des prospects qui ont écrit en dernier : contexte de la carte, et politesse (« merci ») écartée.
  const lastTexts = new Map<string, string>();
  for (const r of base.filter((x) => x.lastIn && (!x.lastOut || x.lastIn > x.lastOut)).slice(0, 80)) {
    const m = await db.query.waMessages.findFirst({
      where: sql`'+' || ${wa.phone} = ${r.phone} and ${wa.direction} = 'in'`,
      orderBy: sql`${wa.sentAt} desc`,
      columns: { type: true, body: true, transcript: true },
    });
    if (!m) continue;
    r.lastInText = m.transcript ?? (m.type === "text" || m.type === "reaction" ? m.body ?? "" : null);
    lastTexts.set(r.id, m.transcript ? `🎤 ${m.transcript}` : m.body ? m.body : `[${m.type}]`);
  }
  const cards = relanceCards(base as (RelanceRow & (typeof base)[number])[], now.getTime()) as ((typeof base)[number] & ReturnType<typeof relanceCards>[number])[];
  return { cards, lastTexts };
}

export async function markRelanceClicked(id: string, now = new Date()) {
  await getDb().update(schema.chantierRequests).set({ relanceClickedAt: now }).where(eq(schema.chantierRequests.id, id));
}
