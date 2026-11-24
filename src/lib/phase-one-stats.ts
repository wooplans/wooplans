import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { inChunks } from "@/lib/sql-chunks";
import { getDb, schema } from "@/db";
import { catalogueProductIds } from "@/lib/chariow";
import { reservedUntil } from "@/lib/catalogue-offer-rules";
import { LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";
import { cohortConversion } from "@/lib/lead-heat-rules";

/**
 * Passage au Catalogue Premium mesuré à la fin de la 1re séquence (décision de Tao, 24 nov. 2026) : pour chaque
 * acheteur de l'extrait ou du guide dont le prix réservé est terminé, a-t-il acheté le catalogue (au plus tard 24 h
 * après la fin) ? Par offre et par pays, sur les séquences terminées depuis `days` jours. Objectif : 10 %.
 */
export async function phaseOneStats(days = 30, now = new Date()) {
  const db = getDb();
  const since = new Date(now.getTime() - (days + 8) * 86_400_000);
  const [intents, sales] = await Promise.all([
    db.query.checkoutIntents.findMany({
      where: and(inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid"), gte(schema.checkoutIntents.createdAt, since)),
      columns: { email: true, ctaId: true, createdAt: true },
    }),
    db.query.sales.findMany({
      where: and(eq(schema.sales.status, "completed"), inArray(schema.sales.productId, [...catalogueProductIds()])),
      columns: { email: true, occurredAt: true },
    }),
  ]);
  // Premier achat d'entrée par email.
  const first = new Map<string, { offer: "extrait" | "guide"; at: Date }>();
  for (const i of intents) {
    const e = (i.email || "").toLowerCase();
    if (!e) continue;
    const cur = first.get(e);
    if (!cur || i.createdAt < cur.at) first.set(e, { offer: i.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide", at: i.createdAt });
  }
  const emails = [...first.keys()];
  const prospects = emails.length
    ? await inChunks(emails, (chunk) =>
        db.query.prospects.findMany({ where: inArray(sql`lower(${schema.prospects.email})`, chunk), columns: { email: true, country: true, offerReopenUntil: true } }),
      )
    : [];
  const byEmail = new Map(prospects.map((p) => [p.email.toLowerCase(), p]));
  const bought = new Map<string, Date>();
  for (const s of sales) {
    const e = (s.email || "").toLowerCase();
    if (e && first.has(e) && (!bought.get(e) || s.occurredAt < bought.get(e)!)) bought.set(e, s.occurredAt);
  }
  const windowStart = now.getTime() - days * 86_400_000;
  const rows = emails
    .map((e) => {
      const f = first.get(e)!;
      const p = byEmail.get(e);
      const until = reservedUntil(f.at, p?.offerReopenUntil ?? null, 7)!;
      const c = bought.get(e);
      return { offer: f.offer, country: p?.country || "?", until, convertedAt: c && c >= f.at ? c : null };
    })
    .filter((r) => r.until.getTime() >= windowStart);
  const group = (key: (r: (typeof rows)[number]) => string) => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return [...m].map(([k, list]) => ({ key: k, ...cohortConversion(list, now), running: list.filter((r) => r.until > now).length })).sort((a, b) => b.ended - a.ended);
  };
  return { days, total: { ...cohortConversion(rows, now), running: rows.filter((r) => r.until > now).length }, byOffer: group((r) => r.offer), byCountry: group((r) => r.country) };
}
