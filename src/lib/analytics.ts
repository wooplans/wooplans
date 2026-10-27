import { and, count, countDistinct, desc, eq, gte, isNotNull, isNull, lt, ne, sql, sum, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { getDb, schema } from "@/db";
import { channelOf, type Channel } from "@/lib/attribution";
import { TZ_OFFSET_MS, localDay, type Range } from "@/lib/date-range";
import { getEnv } from "@/lib/env";

/** Produit Chariow « Plan et devis » : ses ventes sont comptées à part du Catalogue Premium. */
function planDevisProductId() {
  return getEnv().CHARIOW_PLAN_PRODUCT_ID || "__aucun__";
}

/** Vue de la page de vente actuelle (marqueur « b » gardé de l'ancien test A/B, pour la continuité des chiffres). */
const SALES_PAGE_VIEW = "variant_b";

/** Colonne dans la période [since, until[. */
function within(col: SQLiteColumn, range: Range): SQL {
  return and(gte(col, range.since), lt(col, range.until))!;
}

/** Indicateurs du tunnel : visites → page de vente → paiement démarré → achat. */
export async function getFunnelKpis(range: Range) {
  const db = getDb();
  const ev = schema.events;

  const [visitors] = await db.select({ n: count() }).from(schema.visitors).where(within(schema.visitors.createdAt, range));
  const eventCounts = await db
    .select({ type: ev.type, n: count(), visitors: countDistinct(ev.visitorId) })
    .from(ev)
    .where(within(ev.createdAt, range))
    .groupBy(ev.type);
  const byType = Object.fromEntries(eventCounts.map((e) => [e.type, e]));

  const planId = planDevisProductId();
  const [catalogue] = await db
    .select({ n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), ne(schema.sales.productId, planId), within(schema.sales.occurredAt, range)));
  const [planDevis] = await db
    .select({ n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), eq(schema.sales.productId, planId), within(schema.sales.occurredAt, range)));
  const [checkouts] = await db
    .select({ n: count() })
    .from(schema.checkoutIntents)
    .where(and(isNull(schema.checkoutIntents.planSlug), within(schema.checkoutIntents.createdAt, range)));
  const [planDevisCheckouts] = await db
    .select({ n: count() })
    .from(schema.checkoutIntents)
    .where(and(isNotNull(schema.checkoutIntents.planSlug), within(schema.checkoutIntents.createdAt, range)));
  const [abandoned] = await db
    .select({ n: count() })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "abandoned"), ne(schema.sales.productId, planId), within(schema.sales.occurredAt, range)));
  const [customPlans] = await db
    .select({ revenue: sum(schema.leadPayments.amount) })
    .from(schema.leadPayments)
    .where(within(schema.leadPayments.paidAt, range));
  const [newLeads] = await db.select({ n: count() }).from(schema.leads).where(within(schema.leads.createdAt, range));
  const [newMembers] = await db.select({ n: count() }).from(schema.members).where(within(schema.members.createdAt, range));
  const [activeMembers] = await db.select({ n: count() }).from(schema.members).where(eq(schema.members.status, "active"));

  // Page de vente : seule la page actuelle (marqueur « variant_b ») compte ; l'ancienne page A est retirée.
  const [salesPage] = await db
    .select({ visitors: countDistinct(ev.visitorId) })
    .from(ev)
    .where(and(eq(ev.type, "sales_page_view"), eq(ev.ctaId, SALES_PAGE_VIEW), within(ev.createdAt, range)));

  const salesPageVisitors = salesPage?.visitors ?? 0;
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
    planDevisCheckouts: planDevisCheckouts?.n ?? 0,
    planDevisPurchases: planDevis?.n ?? 0,
    planDevisRevenue: Number(planDevis?.revenue ?? 0),
    customPlanRevenue: Number(customPlans?.revenue ?? 0),
    whatsappClicks: byType.whatsapp_click?.n ?? 0,
    newLeads: newLeads?.n ?? 0,
    newMembers: newMembers?.n ?? 0,
    activeMembers: activeMembers?.n ?? 0,
    salesPageConversion: salesPageVisitors ? purchases / salesPageVisitors : 0,
  };
}

type ChannelRow = { channel: Channel; paid: boolean; visitors: number; checkouts: number; purchases: number; revenue: number };
type CampaignRow = ChannelRow & { campaign: string };

/**
 * Performance par canal (Facebook, YouTube, Google…), visiteurs → paiements démarrés → achats → revenu,
 * puis détail par campagne UTM. Achats et paiements sont rattachés au canal de la visite qui les a lancés ;
 * les ventes sans visite suivie (import de l'ancienne boutique Chariow) sont comptées à part.
 */
export async function getChannelBreakdown(range: Range) {
  const db = getDb();
  const v = schema.visitors;
  // Hôte du référent (« https://m.facebook.com/x » → « m.facebook.com ») : regroupe les visites par site d'origine.
  const rest = sql`substr(${v.referrer}, instr(${v.referrer}, '://') + 3)`;
  const host = sql<string | null>`case when ${v.referrer} is null then null else substr(${rest}, 1, instr(${rest} || '/', '/') - 1) end`;
  const campaign = sql<string>`coalesce(${v.utmCampaign}, '')`;
  const dims = { source: v.source, utmSource: v.utmSource, fbclid: v.fbclid, host, campaign };
  const groupBy = [v.source, v.utmSource, v.fbclid, host, campaign] as const;

  const [visits, intents, sales] = await Promise.all([
    db.select({ ...dims, n: count() }).from(v).where(within(v.createdAt, range)).groupBy(...groupBy),
    db
      .select({ ...dims, n: count() })
      .from(schema.checkoutIntents)
      .leftJoin(v, eq(v.id, schema.checkoutIntents.visitorId))
      .where(within(schema.checkoutIntents.createdAt, range))
      .groupBy(...groupBy),
    db
      .select({ ...dims, n: count(), revenue: sum(schema.sales.amount) })
      .from(schema.sales)
      .leftJoin(v, eq(v.id, schema.sales.visitorId))
      .where(and(eq(schema.sales.status, "completed"), within(schema.sales.occurredAt, range)))
      .groupBy(...groupBy),
  ]);

  const channels = new Map<string, ChannelRow>();
  const campaigns = new Map<string, CampaignRow>();
  const untracked = { purchases: 0, revenue: 0 };
  type Dims = { n: number; source: string | null; utmSource: string | null; fbclid: boolean | null; host: string | null; campaign: string };
  const add = (r: Dims, field: "visitors" | "checkouts" | "purchases", revenue = 0) => {
    const { channel, paid } = channelOf({
      source: r.source ?? "direct",
      utmSource: r.utmSource,
      fbclid: Boolean(r.fbclid),
      referrer: r.host ? `https://${r.host}/` : null,
    });
    const blank = { channel, paid, visitors: 0, checkouts: 0, purchases: 0, revenue: 0 };
    const c = channels.get(`${channel}|${paid}`) ?? { ...blank };
    c[field] += r.n;
    c.revenue += revenue;
    channels.set(`${channel}|${paid}`, c);
    if (!r.campaign) return;
    const k = `${channel}|${paid}|${r.campaign}`;
    const row = campaigns.get(k) ?? { ...blank, campaign: r.campaign };
    row[field] += r.n;
    row.revenue += revenue;
    campaigns.set(k, row);
  };
  for (const r of visits) add(r, "visitors");
  for (const r of intents) if (r.source !== null) add(r, "checkouts");
  for (const r of sales) {
    if (r.source === null) {
      untracked.purchases += r.n;
      untracked.revenue += Number(r.revenue ?? 0);
    } else add(r, "purchases", Number(r.revenue ?? 0));
  }
  const order = (a: ChannelRow, b: ChannelRow) => b.revenue - a.revenue || b.purchases - a.purchases || b.visitors - a.visitors;
  return {
    channels: [...channels.values()].sort(order),
    campaigns: [...campaigns.values()].sort(order),
    untracked,
  };
}

export async function getTopCtas(range: Range) {
  const ev = schema.events;
  return getDb()
    .select({ ctaId: ev.ctaId, n: count() })
    .from(ev)
    .where(and(eq(ev.type, "cta_click"), within(ev.createdAt, range)))
    .groupBy(ev.ctaId)
    .orderBy(desc(count()))
    .limit(10);
}

export async function getTopPlans(range: Range) {
  const ev = schema.events;
  return getDb()
    .select({ slug: ev.planSlug, n: count() })
    .from(ev)
    .where(and(eq(ev.type, "plan_view"), within(ev.createdAt, range)))
    .groupBy(ev.planSlug)
    .orderBy(desc(count()))
    .limit(10);
}

/**
 * Série visiteurs / achats / revenu catalogue : par jour, ou par heure quand un seul jour est demandé
 * (heure du Cameroun). `day` : AAAA-MM-JJ, ou « HH » pour une série horaire.
 */
export async function getDailySeries(range: Range) {
  const db = getDb();
  const hourly = range.days === 1;
  const offset = TZ_OFFSET_MS / 1000;
  const bucket = (col: typeof schema.visitors.createdAt | typeof schema.sales.occurredAt) =>
    sql<string>`strftime(${hourly ? "%H" : "%Y-%m-%d"}, ${col} / 1000 + ${offset}, 'unixepoch')`;
  const visitors = await db
    .select({ day: bucket(schema.visitors.createdAt), n: count() })
    .from(schema.visitors)
    .where(within(schema.visitors.createdAt, range))
    .groupBy(bucket(schema.visitors.createdAt));
  const sales = await db
    .select({ day: bucket(schema.sales.occurredAt), n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), ne(schema.sales.productId, planDevisProductId()), within(schema.sales.occurredAt, range)))
    .groupBy(bucket(schema.sales.occurredAt));

  const keys = hourly
    ? Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))
    : Array.from({ length: range.days }, (_, i) => localDay(new Date(range.since.getTime() + i * 86_400_000)));
  return keys.map((day) => ({
    day,
    visitors: visitors.find((v) => v.day === day)?.n ?? 0,
    purchases: sales.find((s) => s.day === day)?.n ?? 0,
    revenue: Number(sales.find((s) => s.day === day)?.revenue ?? 0),
  }));
}

/**
 * Tunnel de la page de vente : vues, clics, paiements démarrés, échoués, abandonnés, achats, WhatsApp.
 * Seuls les événements de la page actuelle (« variant_b », suffixe « @b ») sont comptés : ceux de l'ancienne
 * page A, retirée, sont écartés pour des chiffres fiables.
 */
export async function getSalesPageStats(range: Range) {
  const db = getDb();
  const ev = schema.events;
  const current = (col: typeof ev.ctaId | typeof schema.checkoutIntents.ctaId) => sql`(${col} = ${SALES_PAGE_VIEW} or ${col} like '%@b')`;

  const events = await db
    .select({ type: ev.type, n: count(), visitors: countDistinct(ev.visitorId) })
    .from(ev)
    .where(and(within(ev.createdAt, range), current(ev.ctaId), sql`${ev.type} in ('sales_page_view','cta_click','whatsapp_click','purchase')`))
    .groupBy(ev.type);
  const intents = await db
    .select({ status: schema.checkoutIntents.status, n: count() })
    .from(schema.checkoutIntents)
    .where(and(within(schema.checkoutIntents.createdAt, range), current(schema.checkoutIntents.ctaId)))
    .groupBy(schema.checkoutIntents.status);

  const e = (type: string) => events.find((r) => r.type === type);
  const i = (status?: string) => intents.filter((r) => !status || r.status === status).reduce((sum, r) => sum + r.n, 0);
  const visitors = e("sales_page_view")?.visitors ?? 0;
  const purchases = e("purchase")?.n ?? 0;
  return {
    visitors,
    ctaVisitors: e("cta_click")?.visitors ?? 0,
    checkouts: i(),
    failed: i("failed"),
    abandoned: i("abandoned"),
    purchases,
    whatsapp: e("whatsapp_click")?.n ?? 0,
    conversion: visitors ? purchases / visitors : 0,
  };
}
