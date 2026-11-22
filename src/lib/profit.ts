import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import couts from "@/config/couts.json";
import { getDb, schema } from "@/db";
import { catalogueProductIds, planProductId } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { leadOfferByProduct, leadProductIds } from "@/lib/lead-offers";
import { campaignProduct, profitReport, type CostConfig, type Product } from "@/lib/profit-rules";

/**
 * Tableau « Gain réel » (/admin/gains) : ventes de la base, pub Meta relevée chaque dimanche (table ad_spend),
 * abonnements (src/config/couts.json) et dépenses saisies (table expenses). Périodes en UTC (heure d'Abidjan).
 */
export const COSTS = couts as CostConfig;
export type Period = "jour" | "7j" | "mois" | "30j";
const DAY = 86_400_000;

export function periodRange(period: Period, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = new Date(today + DAY);
  const start =
    period === "jour"
      ? new Date(today)
      : period === "7j"
        ? new Date(today - 6 * DAY)
        : period === "30j"
          ? new Date(today - 29 * DAY)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const days = Math.min((end.getTime() - start.getTime()) / DAY, (now.getTime() - start.getTime()) / DAY);
  return { start, end, days: Math.max(days, 1 / 24) };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function saleProduct(productId: string, productName: string | null): Product {
  const lead = leadOfferByProduct(productId);
  if (lead) return lead.key;
  if (planProductId() && productId === planProductId()) return "plan_devis";
  if ((productName || "").startsWith("Plan et devis")) return "plan_devis";
  if (catalogueProductIds().has(productId)) return "catalogue";
  return "autre";
}

export async function profitFor(period: Period, now = new Date()) {
  const { start, end, days } = periodRange(period, now);
  const db = getDb();
  const [sales, spend, expenses, last] = await Promise.all([
    db.query.sales.findMany({
      where: and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, start), lt(schema.sales.occurredAt, end)),
      columns: { productId: true, productName: true, amount: true, email: true, prospectId: true },
    }),
    db.select({ name: schema.adSpend.campaignName, usd: sql<number>`sum(${schema.adSpend.spendUsd})` })
      .from(schema.adSpend)
      .where(and(gte(schema.adSpend.date, ymd(start)), lt(schema.adSpend.date, ymd(end))))
      .groupBy(schema.adSpend.campaignName),
    db.query.expenses.findMany({ where: and(gte(schema.expenses.date, ymd(start)), lt(schema.expenses.date, ymd(end))), orderBy: desc(schema.expenses.date) }),
    db.select({ d: sql<string | null>`max(${schema.adSpend.date})` }).from(schema.adSpend),
  ]);
  const revenue: Partial<Record<Product, { amount: number; count: number }>> = {};
  let fromLeads = 0;
  const leadIds = leadProductIds();
  const leadBuyers = new Set(
    leadIds.length
      ? (
          await db.query.sales.findMany({
            where: and(eq(schema.sales.status, "completed"), inArray(schema.sales.productId, leadIds)),
            columns: { email: true },
          })
        )
          .map((s) => s.email)
          .filter(Boolean)
      : [],
  );
  for (const s of sales) {
    const p = saleProduct(s.productId, s.productName);
    const r = (revenue[p] ??= { amount: 0, count: 0 });
    r.amount += s.amount;
    r.count += 1;
    if (p === "catalogue" && (s.prospectId || (s.email && leadBuyers.has(s.email)))) fromLeads++;
  }
  const adSpendUsd: Partial<Record<Product, number>> = {};
  // Produit d'après le nom de la campagne (règle unique : src/lib/profit-rules.ts), campagnes « AQC MyM » exclues.
  for (const row of spend) {
    const product = campaignProduct(row.name, COSTS);
    if (product) adSpendUsd[product] = (adSpendUsd[product] ?? 0) + (Number(row.usd) || 0);
  }
  const report = profitReport({ days, revenue, adSpendUsd, expenses: expenses.map((e) => ({ label: e.label, amount: e.amount })) }, COSTS);
  return { ...report, period, start, end, days, expenses, catalogueFromLeads: fromLeads, adSpendUntil: last[0]?.d ?? null };
}

/** Relevé de la pub Meta (tâche du dimanche, ou à la main) : une ligne par jour et par campagne, remplacée si elle existe. */
export async function upsertAdSpend(rows: { date: string; campaignId: string; campaignName: string; spendUsd: number }[]) {
  const db = getDb();
  let saved = 0;
  for (const r of rows) {
    const product = campaignProduct(r.campaignName, COSTS);
    if (!product || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !(r.spendUsd >= 0)) continue;
    await db
      .insert(schema.adSpend)
      .values({ date: r.date, campaignId: r.campaignId, campaignName: r.campaignName, spendUsd: r.spendUsd, product, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.adSpend.date, schema.adSpend.campaignId],
        set: { campaignName: r.campaignName, spendUsd: r.spendUsd, product, updatedAt: new Date() },
      });
    saved++;
  }
  return saved;
}

export async function addExpense(input: { date: string; category: string; label: string; amount: number; currency: "XAF" | "USD" }) {
  const amount = input.currency === "USD" ? Math.round(input.amount * COSTS.usdToFcfa) : Math.round(input.amount);
  await getDb()
    .insert(schema.expenses)
    .values({ id: randomId(), date: input.date, category: input.category, label: input.label.slice(0, 120), amount, currency: input.currency, originalAmount: input.amount });
}

export async function deleteExpense(id: string) {
  await getDb().delete(schema.expenses).where(eq(schema.expenses.id, id));
}
