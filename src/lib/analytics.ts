import { and, count, countDistinct, desc, eq, gte, sql, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Period = 7 | 30 | 90 | 365;

export function periodStart(days: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** Indicateurs du tunnel : visites → page de vente → paiement démarré → achat. */
export async function getFunnelKpis(days: Period) {
  const db = getDb();
  const since = periodStart(days);
  const ev = schema.events;

  const [visitors] = await db.select({ n: count() }).from(schema.visitors).where(gte(schema.visitors.createdAt, since));
  const eventCounts = await db
    .select({ type: ev.type, n: count(), visitors: countDistinct(ev.visitorId) })
    .from(ev)
    .where(gte(ev.createdAt, since))
    .groupBy(ev.type);
  const byType = Object.fromEntries(eventCounts.map((e) => [e.type, e]));

  const [catalogue] = await db
    .select({ n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, since)));
  const [checkouts] = await db.select({ n: count() }).from(schema.checkoutIntents).where(gte(schema.checkoutIntents.createdAt, since));
  const [abandoned] = await db
    .select({ n: count() })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "abandoned"), gte(schema.sales.occurredAt, since)));
  const [customPlans] = await db
    .select({ revenue: sum(schema.leadPayments.amount) })
    .from(schema.leadPayments)
    .where(gte(schema.leadPayments.paidAt, since));
  const [newLeads] = await db.select({ n: count() }).from(schema.leads).where(gte(schema.leads.createdAt, since));
  const [newMembers] = await db.select({ n: count() }).from(schema.members).where(gte(schema.members.createdAt, since));
  const [activeMembers] = await db.select({ n: count() }).from(schema.members).where(eq(schema.members.status, "active"));

  const salesPageVisitors = byType.sales_page_view?.visitors ?? 0;
  const purchases = catalogue?.n ?? 0;
  return {
    visitors: visitors?.n ?? 0,
    pageViews: (byType.page_view?.n ?? 0) + (byType.plan_view?.n ?? 0) + (byType.sales_page_view?.n ?? 0),
    planViews: byType.plan_view?.n ?? 0,
    ctaClicks: byType.cta_click?.n ?? 0,
    salesPageVisitors,
    checkoutStarts: checkouts?.n ?? 0,
    abandonedCheckouts: abandoned?.n ?? 0,
    purchases,
    catalogueRevenue: Number(catalogue?.revenue ?? 0),
    customPlanRevenue: Number(customPlans?.revenue ?? 0),
    whatsappClicks: byType.whatsapp_click?.n ?? 0,
    newLeads: newLeads?.n ?? 0,
    newMembers: newMembers?.n ?? 0,
    activeMembers: activeMembers?.n ?? 0,
    salesPageConversion: salesPageVisitors ? purchases / salesPageVisitors : 0,
  };
}

/** Performance par source et campagne UTM (visiteurs → achats → revenu). */
export async function getSourceBreakdown(days: Period) {
  const db = getDb();
  const since = periodStart(days);
  const v = schema.visitors;
  const rows = await db
    .select({
      source: v.source,
      campaign: sql<string>`coalesce(${v.utmCampaign}, '—')`,
      visitors: count(v.id),
    })
    .from(v)
    .where(gte(v.createdAt, since))
    .groupBy(v.source, sql`coalesce(${v.utmCampaign}, '—')`)
    .orderBy(desc(count(v.id)))
    .limit(30);

  const sales = await db
    .select({
      source: sql<string>`coalesce(${schema.sales.source}, 'inconnue')`,
      campaign: sql<string>`coalesce(${schema.sales.utmCampaign}, '—')`,
      purchases: count(),
      revenue: sum(schema.sales.amount),
    })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, since)))
    .groupBy(sql`coalesce(${schema.sales.source}, 'inconnue')`, sql`coalesce(${schema.sales.utmCampaign}, '—')`);

  const checkouts = await db
    .select({
      source: sql<string>`coalesce(${v.source}, 'inconnue')`,
      campaign: sql<string>`coalesce(${v.utmCampaign}, '—')`,
      n: count(),
    })
    .from(schema.checkoutIntents)
    .leftJoin(v, eq(v.id, schema.checkoutIntents.visitorId))
    .where(gte(schema.checkoutIntents.createdAt, since))
    .groupBy(sql`coalesce(${v.source}, 'inconnue')`, sql`coalesce(${v.utmCampaign}, '—')`);

  const key = (s: string, c: string) => `${s}|${c}`;
  const map = new Map<string, { source: string; campaign: string; visitors: number; checkouts: number; purchases: number; revenue: number }>();
  for (const r of rows) map.set(key(r.source, r.campaign), { ...r, checkouts: 0, purchases: 0, revenue: 0 });
  for (const c of checkouts) {
    const k = key(c.source, c.campaign);
    const row = map.get(k) ?? { source: c.source, campaign: c.campaign, visitors: 0, checkouts: 0, purchases: 0, revenue: 0 };
    row.checkouts = c.n;
    map.set(k, row);
  }
  for (const s of sales) {
    const k = key(s.source, s.campaign);
    const row = map.get(k) ?? { source: s.source, campaign: s.campaign, visitors: 0, checkouts: 0, purchases: 0, revenue: 0 };
    row.purchases = s.purchases;
    row.revenue = Number(s.revenue ?? 0);
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
}

export async function getTopCtas(days: Period) {
  const ev = schema.events;
  return getDb()
    .select({ ctaId: ev.ctaId, n: count() })
    .from(ev)
    .where(and(eq(ev.type, "cta_click"), gte(ev.createdAt, periodStart(days))))
    .groupBy(ev.ctaId)
    .orderBy(desc(count()))
    .limit(10);
}

export async function getTopPlans(days: Period) {
  const ev = schema.events;
  return getDb()
    .select({ slug: ev.planSlug, n: count() })
    .from(ev)
    .where(and(eq(ev.type, "plan_view"), gte(ev.createdAt, periodStart(days))))
    .groupBy(ev.planSlug)
    .orderBy(desc(count()))
    .limit(10);
}

/** Série journalière : visiteurs et achats. */
export async function getDailySeries(days: Period) {
  const db = getDb();
  const since = periodStart(days);
  const day = (col: typeof schema.visitors.createdAt | typeof schema.sales.occurredAt) =>
    sql<string>`strftime('%Y-%m-%d', ${col} / 1000, 'unixepoch')`;
  const visitors = await db
    .select({ day: day(schema.visitors.createdAt), n: count() })
    .from(schema.visitors)
    .where(gte(schema.visitors.createdAt, since))
    .groupBy(day(schema.visitors.createdAt));
  const sales = await db
    .select({ day: day(schema.sales.occurredAt), n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, since)))
    .groupBy(day(schema.sales.occurredAt));

  const out: { day: string; visitors: number; purchases: number; revenue: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400_000).toISOString().slice(0, 10);
    out.push({
      day: d,
      visitors: visitors.find((v) => v.day === d)?.n ?? 0,
      purchases: sales.find((s) => s.day === d)?.n ?? 0,
      revenue: Number(sales.find((s) => s.day === d)?.revenue ?? 0),
    });
  }
  return out;
}
