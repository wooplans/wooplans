import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql, sum, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { getDb, schema } from "@/db";
import { channelOf, type Channel } from "@/lib/attribution";
import { TZ_OFFSET_MS, localDay, type Range } from "@/lib/date-range";
import { getEnv } from "@/lib/env";
import { OWNER_EMAILS } from "@/lib/owner-emails";
import { OFFRES, offreProductIds } from "@/lib/offres";

/** Produit Chariow « Plan et devis » : ses ventes sont comptées à part du Catalogue Premium. */
function planDevisProductId() {
  return getEnv().CHARIOW_PLAN_PRODUCT_ID || "__aucun__";
}

/**
 * Ventes depuis les fiches modèles : offres « plan et devis + Catalogue Premium offert » (39k, 29k, 19k) et ancien
 * plan et devis seul (14 900). Le reste des ventes (page de vente /catalogue-premium) est le Catalogue Premium seul.
 */
function ficheProductIds() {
  return [planDevisProductId(), ...offreProductIds().keys()];
}

/** Libellé d'une vente selon son produit : offre (39k…), plan et devis seul, ou catalogue seul. */
export function saleOffer(productId: string): { key: string; label: string; fiche: boolean } {
  const offre = offreProductIds().get(productId);
  if (offre) return { key: offre.id, label: `Plan et devis + catalogue offert · ${offre.price.toLocaleString("fr-FR")} FCFA`, fiche: true };
  if (productId === planDevisProductId()) return { key: "plan_seul", label: "Plan et devis seul (ancienne offre)", fiche: true };
  return { key: "catalogue", label: "Catalogue Premium seul (page de vente)", fiche: false };
}

/** Vue de la page de vente actuelle (marqueur « b » gardé de l'ancien test A/B, pour la continuité des chiffres). */
const SALES_PAGE_VIEW = "variant_b";

/** Exclut les essais du propriétaire (ventes et intentions de paiement faites avec ses propres adresses). */
const notOwnerSale = () => or(isNull(schema.sales.email), notInArray(sql`lower(${schema.sales.email})`, [...OWNER_EMAILS]))!;
const notOwnerIntent = () => or(isNull(schema.checkoutIntents.email), notInArray(sql`lower(${schema.checkoutIntents.email})`, [...OWNER_EMAILS]))!;

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

  const fiche = ficheProductIds();
  const [catalogue] = await db
    .select({ n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), notInArray(schema.sales.productId, fiche), within(schema.sales.occurredAt, range), notOwnerSale()));
  // Ventes des fiches modèles : offres avec catalogue offert et ancien plan et devis seul.
  const [planDevis] = await db
    .select({ n: count(), revenue: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), inArray(schema.sales.productId, fiche), within(schema.sales.occurredAt, range), notOwnerSale()));
  const [checkouts] = await db
    .select({ n: count() })
    .from(schema.checkoutIntents)
    .where(and(isNull(schema.checkoutIntents.planSlug), within(schema.checkoutIntents.createdAt, range), notOwnerIntent()));
  const [planDevisCheckouts] = await db
    .select({ n: count() })
    .from(schema.checkoutIntents)
    .where(and(isNotNull(schema.checkoutIntents.planSlug), ne(schema.checkoutIntents.status, "gift"), within(schema.checkoutIntents.createdAt, range), notOwnerIntent()));
  // Plans et devis offerts (formulaire email des fiches) : contacts captés, comptés à part des paiements.
  const [gifts] = await db
    .select({ n: count() })
    .from(schema.checkoutIntents)
    .where(and(eq(schema.checkoutIntents.status, "gift"), within(schema.checkoutIntents.createdAt, range), notOwnerIntent()));
  const [abandoned] = await db
    .select({ n: count() })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "abandoned"), notInArray(schema.sales.productId, fiche), within(schema.sales.occurredAt, range), notOwnerSale()));
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
    giftLeads: gifts?.n ?? 0,
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
      .where(and(ne(schema.checkoutIntents.status, "gift"), within(schema.checkoutIntents.createdAt, range), notOwnerIntent()))
      .groupBy(...groupBy),
    db
      .select({ ...dims, n: count(), revenue: sum(schema.sales.amount) })
      .from(schema.sales)
      .leftJoin(v, eq(v.id, schema.sales.visitorId))
      .where(and(eq(schema.sales.status, "completed"), within(schema.sales.occurredAt, range), notOwnerSale()))
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
    .where(and(eq(schema.sales.status, "completed"), within(schema.sales.occurredAt, range), notOwnerSale()))
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
    .where(and(within(schema.checkoutIntents.createdAt, range), notOwnerIntent(), current(schema.checkoutIntents.ctaId)))
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

/**
 * Tableau de bord du plan et devis (fiches modèles) : visiteurs des fiches → clic sur le bouton d'achat →
 * paiement démarré → payé, échoué ou abandonné ; puis détail par modèle, par campagne et jour par jour.
 * Les essais du propriétaire et les plans offerts (cadeau) sont exclus des paiements.
 */
export async function getPlanDevisStats(range: Range) {
  const db = getDb();
  const ev = schema.events;
  const ci = schema.checkoutIntents;
  const v = schema.visitors;
  const paidIntents = and(isNotNull(ci.planSlug), ne(ci.status, "gift"), within(ci.createdAt, range), notOwnerIntent())!;
  const planSales = and(eq(schema.sales.status, "completed"), inArray(schema.sales.productId, ficheProductIds()), within(schema.sales.occurredAt, range), notOwnerSale())!;
  const buyClick = sql`(${ev.ctaId} like 'plan_projet%')`;

  const [views, clicks, previews, intents, sales, byModelViews, byModelIntents, byCampaignViews, byCampaignIntents, recent] = await Promise.all([
    db.select({ visitors: countDistinct(ev.visitorId), n: count() }).from(ev).where(and(eq(ev.type, "plan_view"), within(ev.createdAt, range))),
    db.select({ visitors: countDistinct(ev.visitorId) }).from(ev).where(and(eq(ev.type, "cta_click"), buyClick, within(ev.createdAt, range))),
    db.select({ visitors: countDistinct(ev.visitorId) }).from(ev).where(and(eq(ev.type, "cta_click"), eq(ev.ctaId, "plan_devis_apercu"), within(ev.createdAt, range))),
    db.select({ status: ci.status, n: count() }).from(ci).where(paidIntents).groupBy(ci.status),
    db.select({ n: count(), revenue: sum(schema.sales.amount) }).from(schema.sales).where(planSales),
    db
      .select({ slug: ev.planSlug, views: count(), visitors: countDistinct(ev.visitorId) })
      .from(ev)
      .where(and(eq(ev.type, "plan_view"), isNotNull(ev.planSlug), within(ev.createdAt, range)))
      .groupBy(ev.planSlug),
    db.select({ slug: ci.planSlug, status: ci.status, n: count() }).from(ci).where(paidIntents).groupBy(ci.planSlug, ci.status),
    db
      .select({ campaign: sql<string>`coalesce(${v.utmCampaign}, '')`, source: v.source, visitors: countDistinct(ev.visitorId) })
      .from(ev)
      .leftJoin(v, eq(v.id, ev.visitorId))
      .where(and(eq(ev.type, "plan_view"), within(ev.createdAt, range)))
      .groupBy(sql`coalesce(${v.utmCampaign}, '')`, v.source),
    db
      .select({ campaign: sql<string>`coalesce(${v.utmCampaign}, '')`, source: v.source, status: ci.status, n: count() })
      .from(ci)
      .leftJoin(v, eq(v.id, ci.visitorId))
      .where(paidIntents)
      .groupBy(sql`coalesce(${v.utmCampaign}, '')`, v.source, ci.status),
    db
      .select({ id: ci.id, slug: ci.planSlug, status: ci.status, email: ci.email, createdAt: ci.createdAt, downloads: ci.downloads })
      .from(ci)
      .where(paidIntents)
      .orderBy(desc(ci.createdAt))
      .limit(40),
  ]);

  const status = (s?: string) => intents.filter((r) => !s || r.status === s).reduce((t, r) => t + r.n, 0);
  const ficheVisitors = views[0]?.visitors ?? 0;
  const purchases = sales[0]?.n ?? 0;

  const models = new Map<string, { slug: string; views: number; visitors: number; checkouts: number; paid: number }>();
  const model = (slug: string) => models.get(slug) ?? models.set(slug, { slug, views: 0, visitors: 0, checkouts: 0, paid: 0 }).get(slug)!;
  for (const r of byModelViews) if (r.slug) Object.assign(model(r.slug), { views: r.views, visitors: r.visitors });
  for (const r of byModelIntents) {
    if (!r.slug) continue;
    const m = model(r.slug);
    m.checkouts += r.n;
    if (r.status === "paid") m.paid += r.n;
  }

  const campaigns = new Map<string, { campaign: string; source: string | null; visitors: number; checkouts: number; paid: number }>();
  const camp = (campaign: string, source: string | null) => {
    const key = `${campaign}|${source ?? ""}`;
    return campaigns.get(key) ?? campaigns.set(key, { campaign, source, visitors: 0, checkouts: 0, paid: 0 }).get(key)!;
  };
  for (const r of byCampaignViews) camp(r.campaign, r.source).visitors += r.visitors;
  for (const r of byCampaignIntents) {
    const c = camp(r.campaign, r.source);
    c.checkouts += r.n;
    if (r.status === "paid") c.paid += r.n;
  }

  return {
    ficheVisitors,
    ficheViews: views[0]?.n ?? 0,
    buyClickVisitors: clicks[0]?.visitors ?? 0,
    previewVisitors: previews[0]?.visitors ?? 0,
    checkouts: status(),
    pending: status("started"),
    paid: status("paid"),
    failed: status("failed"),
    abandoned: status("abandoned"),
    purchases,
    revenue: Number(sales[0]?.revenue ?? 0),
    conversion: ficheVisitors ? purchases / ficheVisitors : 0,
    models: [...models.values()].sort((a, b) => b.paid - a.paid || b.checkouts - a.checkouts || b.visitors - a.visitors).slice(0, 30),
    campaigns: [...campaigns.values()].filter((c) => c.visitors || c.checkouts).sort((a, b) => b.paid - a.paid || b.checkouts - a.checkouts || b.visitors - a.visitors).slice(0, 30),
    recent,
  };
}

/** Série du plan et devis : paiements démarrés, achats et revenu, par jour (ou par heure pour un seul jour). */
export async function getPlanDevisSeries(range: Range) {
  const db = getDb();
  const hourly = range.days === 1;
  const offset = TZ_OFFSET_MS / 1000;
  const bucket = (col: typeof schema.checkoutIntents.createdAt | typeof schema.sales.occurredAt) =>
    sql<string>`strftime(${hourly ? "%H" : "%Y-%m-%d"}, ${col} / 1000 + ${offset}, 'unixepoch')`;
  const [intents, sales] = await Promise.all([
    db
      .select({ day: bucket(schema.checkoutIntents.createdAt), n: count() })
      .from(schema.checkoutIntents)
      .where(and(isNotNull(schema.checkoutIntents.planSlug), ne(schema.checkoutIntents.status, "gift"), within(schema.checkoutIntents.createdAt, range), notOwnerIntent()))
      .groupBy(bucket(schema.checkoutIntents.createdAt)),
    db
      .select({ day: bucket(schema.sales.occurredAt), n: count(), revenue: sum(schema.sales.amount) })
      .from(schema.sales)
      .where(and(eq(schema.sales.status, "completed"), inArray(schema.sales.productId, ficheProductIds()), within(schema.sales.occurredAt, range), notOwnerSale()))
      .groupBy(bucket(schema.sales.occurredAt)),
  ]);
  const keys = hourly
    ? Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))
    : Array.from({ length: range.days }, (_, i) => localDay(new Date(range.since.getTime() + i * 86_400_000)));
  return keys.map((day) => ({
    day,
    checkouts: intents.find((r) => r.day === day)?.n ?? 0,
    purchases: sales.find((r) => r.day === day)?.n ?? 0,
    revenue: Number(sales.find((r) => r.day === day)?.revenue ?? 0),
  }));
}

/**
 * Vue d'ensemble des ventes : par offre (39k, 29k, 19k, plan et devis seul, catalogue seul), par fiche modèle qui a
 * déclenché l'achat (modèle choisi avant le paiement) et dernières ventes. Essais du propriétaire exclus.
 */
export async function getSalesOverview(range: Range) {
  const db = getDb();
  const s = schema.sales;
  const ci = schema.checkoutIntents;
  const done = and(eq(s.status, "completed"), within(s.occurredAt, range), notOwnerSale())!;
  const [byProduct, byModel, pending, recent] = await Promise.all([
    db.select({ productId: s.productId, n: count(), revenue: sum(s.amount) }).from(s).where(done).groupBy(s.productId),
    db
      .select({ slug: ci.planSlug, productId: s.productId, n: count(), revenue: sum(s.amount) })
      .from(s)
      .innerJoin(ci, eq(ci.id, s.intentId))
      .where(and(done, isNotNull(ci.planSlug)))
      .groupBy(ci.planSlug, s.productId),
    db
      .select({ status: s.status, n: count() })
      .from(s)
      .where(and(inArray(s.status, ["abandoned", "failed"]), within(s.occurredAt, range), notOwnerSale()))
      .groupBy(s.status),
    db
      .select({
        id: s.id,
        productId: s.productId,
        amount: s.amount,
        name: s.name,
        email: s.email,
        phone: s.phone,
        country: s.country,
        occurredAt: s.occurredAt,
        source: s.source,
        utmCampaign: s.utmCampaign,
        slug: ci.planSlug,
      })
      .from(s)
      .leftJoin(ci, eq(ci.id, s.intentId))
      .where(done)
      .orderBy(desc(s.occurredAt))
      .limit(25),
  ]);

  // Offres dans l'ordre de la configuration, puis plan et devis seul, puis catalogue seul.
  const order = [...OFFRES.offres.map((o) => o.id), "plan_seul", "catalogue"];
  const offers = new Map<string, { key: string; label: string; fiche: boolean; n: number; revenue: number }>();
  for (const r of byProduct) {
    const o = saleOffer(r.productId);
    const row = offers.get(o.key) ?? { ...o, n: 0, revenue: 0 };
    row.n += r.n;
    row.revenue += Number(r.revenue ?? 0);
    offers.set(o.key, row);
  }
  const models = new Map<string, { slug: string; n: number; revenue: number; offers: Record<string, number> }>();
  for (const r of byModel) {
    if (!r.slug) continue;
    const m = models.get(r.slug) ?? { slug: r.slug, n: 0, revenue: 0, offers: {} };
    m.n += r.n;
    m.revenue += Number(r.revenue ?? 0);
    const key = saleOffer(r.productId).key;
    m.offers[key] = (m.offers[key] ?? 0) + r.n;
    models.set(r.slug, m);
  }
  const total = [...offers.values()].reduce((t, o) => ({ n: t.n + o.n, revenue: t.revenue + o.revenue }), { n: 0, revenue: 0 });
  const fiche = [...offers.values()].filter((o) => o.fiche).reduce((t, o) => ({ n: t.n + o.n, revenue: t.revenue + o.revenue }), { n: 0, revenue: 0 });
  return {
    total,
    fiche,
    offers: [...offers.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
    models: [...models.values()].sort((a, b) => b.revenue - a.revenue || b.n - a.n).slice(0, 15),
    abandoned: pending.find((p) => p.status === "abandoned")?.n ?? 0,
    failed: pending.find((p) => p.status === "failed")?.n ?? 0,
    recent: recent.map((r) => ({ ...r, offer: saleOffer(r.productId) })),
  };
}
