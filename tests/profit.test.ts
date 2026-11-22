import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignProduct, fixedCostsFor, profitReport, type CostConfig } from "../src/lib/profit-rules.ts";

const cfg: CostConfig = {
  usdToFcfa: 750,
  chariowRate: 0.1,
  fixed: [
    { id: "claude", label: "Claude", amount: 20, currency: "USD", per: "month" },
    { id: "genuka", label: "Genuka", amount: 10000, currency: "XAF", per: "month" },
    { id: "domaine", label: "Domaine", amount: 15, currency: "USD", per: "year" },
  ],
  adExcludeNames: ["AQC", "MyM"],
};

test("produit d'une campagne Meta", () => {
  assert.equal(campaignProduct("Extrait du Catalogue Premium · 1 900 FCFA · CI", cfg), "extrait");
  assert.equal(campaignProduct("Catalogue Premium · 29 000 FCFA · Reciblage", cfg), "catalogue");
  assert.equal(campaignProduct("WooPlans · Guide des maisons 1900 · CI · Ventes", cfg), "guide");
  assert.equal(campaignProduct("WooPlans · Ventes · Plan et devis 39k", cfg), "plan_devis");
  assert.equal(campaignProduct("AQC MyM · Notoriété", cfg), null);
});

test("abonnements au prorata", () => {
  const month = fixedCostsFor(30.4, cfg);
  assert.equal(month.find((f) => f.id === "claude")?.amount, 15000);
  assert.equal(month.find((f) => f.id === "genuka")?.amount, 10000);
  assert.equal(fixedCostsFor(365, cfg).find((f) => f.id === "domaine")?.amount, 11250);
});

test("gain réel", () => {
  const r = profitReport({ days: 1, revenue: { extrait: { amount: 19000, count: 10 }, catalogue: { amount: 29000, count: 1 } }, adSpendUsd: { extrait: 20 }, expenses: [{ label: "Poyo", amount: 1000 }] }, cfg);
  assert.equal(r.revenue, 48000);
  assert.equal(r.chariow, 4800);
  assert.equal(r.ads, 15000);
  assert.equal(r.rows.find((x) => x.product === "extrait")?.margin, 19000 - 1900 - 15000);
  const fixed = Math.round(15000 / 30.4) + Math.round(10000 / 30.4) + Math.round(11250 / 365);
  assert.equal(r.profit, 48000 - 4800 - 15000 - fixed - 1000);
});
