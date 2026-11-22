/**
 * Gain réel (décisions de Tao, 22 nov. 2026), règles pures testées dans tests/profit.test.ts :
 * chiffre d'affaires − commission Chariow (10 % de toutes les ventes) − pub Meta (campagnes WooPlans, hors « AQC MyM »)
 * − abonnements (Claude 20 $/mois, Genuka 10 000 FCFA/mois, Cloudflare 5 $/mois, domaine 15 $/an, au prorata des jours)
 * − dépenses saisies (crédits ElevenLabs, Poyo…). 1 USD = 750 FCFA.
 */
export type Product = "catalogue" | "extrait" | "guide" | "plan_devis" | "autre";
export type FixedCost = { id: string; label: string; amount: number; currency: "USD" | "XAF"; per: "month" | "year" };
export type CostConfig = { usdToFcfa: number; chariowRate: number; fixed: FixedCost[]; adExcludeNames: string[] };

export const PRODUCT_LABELS: Record<Product, string> = {
  catalogue: "Catalogue Premium",
  extrait: "Extrait",
  guide: "Guide",
  plan_devis: "Plan et devis",
  autre: "Autres",
};

/** Produit d'une campagne Meta d'après son nom ; null = campagne exclue (« AQC MyM »). */
export function campaignProduct(name: string, cfg: CostConfig): Product | null {
  if (cfg.adExcludeNames.some((x) => name.toLowerCase().includes(x.toLowerCase()))) return null;
  const n = name.toLowerCase();
  if (n.includes("extrait")) return "extrait";
  if (n.includes("guide")) return "guide";
  if (n.includes("plan et devis") || n.includes("fiches directes")) return "plan_devis";
  if (n.includes("catalogue")) return "catalogue";
  return "autre";
}

export function toFcfa(amount: number, currency: string, cfg: CostConfig) {
  return Math.round(currency === "USD" ? amount * cfg.usdToFcfa : amount);
}

/** Abonnements au prorata des jours de la période (mois de 30,4 jours, année de 365 jours). */
export function fixedCostsFor(days: number, cfg: CostConfig) {
  return cfg.fixed.map((f) => ({
    id: f.id,
    label: f.label,
    amount: Math.round((toFcfa(f.amount, f.currency, cfg) * days) / (f.per === "year" ? 365 : 30.4)),
  }));
}

export type ProfitInput = {
  days: number;
  revenue: Partial<Record<Product, { amount: number; count: number }>>;
  adSpendUsd: Partial<Record<Product, number>>;
  expenses: { label: string; amount: number }[];
};

export function profitReport(input: ProfitInput, cfg: CostConfig) {
  const products = Object.keys(PRODUCT_LABELS) as Product[];
  const rows = products
    .map((p) => {
      const revenue = input.revenue[p]?.amount ?? 0;
      const ads = toFcfa(input.adSpendUsd[p] ?? 0, "USD", cfg);
      const chariow = Math.round(revenue * cfg.chariowRate);
      return { product: p, label: PRODUCT_LABELS[p], count: input.revenue[p]?.count ?? 0, revenue, chariow, ads, margin: revenue - chariow - ads };
    })
    .filter((r) => r.revenue || r.ads || r.count);
  const fixed = fixedCostsFor(input.days, cfg);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const chariow = rows.reduce((s, r) => s + r.chariow, 0);
  const ads = rows.reduce((s, r) => s + r.ads, 0);
  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const expensesTotal = input.expenses.reduce((s, e) => s + e.amount, 0);
  const profit = revenue - chariow - ads - fixedTotal - expensesTotal;
  return { rows, fixed, revenue, chariow, ads, fixedTotal, expensesTotal, profit, roas: ads > 0 ? revenue / ads : null };
}
