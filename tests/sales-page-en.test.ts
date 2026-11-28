import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import cfg from "../src/config/catalogue-en.json" with { type: "json" };
import plansEn from "../src/config/plans-en.json" with { type: "json" };
import { enPricing, factsEn, galleryHtmlEn, lotLabelEn, lotShares, modelNameEn, moneyEn, previewHtmlEn } from "../src/lib/sales-page-en.ts";

test("noms anglais façon Maramani : bungalow et two-story, jamais duplex", () => {
  assert.equal(modelNameEn({ name: "Villa V4-005", levels: 1, bedrooms: 4 }), "4 Bedroom Bungalow House – ID V4-005");
  assert.equal(modelNameEn({ name: "Duplex D4-034", levels: 2, bedrooms: 4 }), "Two-story 4 Bedroom House – ID D4-034");
  assert.deepEqual(factsEn({ name: "x", category: "villa", coverImage: "", levels: 1, surfaceTotal: 201, bedrooms: 4, bathrooms: 3 }), ["1 Floor", "4 Bedrooms", "3 Bathrooms", "201 m²"]);
});

test("postes du devis : libellés anglais et parts en %", () => {
  assert.equal(lotLabelEn("Dalle"), "First floor slab");
  const s = lotShares([{ label: "Fondation", amount: 4052200 }, { label: "Élévations", amount: 5933500 }, { label: "Carrelage", amount: 22174300 }]);
  assert.equal(s[0].label, "Substructure (foundation)");
  assert.equal(s[0].share, 12.6);
});

test("galerie et aperçu : aucun montant en FCFA", () => {
  const g = galleryHtmlEn([{ name: "Duplex D4-034", category: "duplex", coverImage: "/media/a.webp", levels: 2, surfaceTotal: 143, bedrooms: 4 }], 108);
  assert.match(g, /Two-story 4 Bedroom House – ID D4-034/);
  assert.match(g, /\+107<\/b>/);
  const p = previewHtmlEn({ name: "Duplex D4-006", category: "duplex", coverImage: "/media/a.webp", levels: 2, surfaceTotal: 195, bedrooms: 4, bathrooms: 3, floorPlanUrls: ["/api/apercu/plan/1", "/api/apercu/plan/2"], lots: [{ label: "Fondation", amount: 1 }, { label: "Dalle", amount: 3 }] });
  assert.doesNotMatch(g + p, /FCFA|[Dd]uplex /);
  assert.match(p, /Ground Floor Plan/);
  assert.match(p, /data-calc-share="75"/);
});

test("prix : montant relevé sur Chariow, plans complets au même taux, pays inconnu = Kenya", () => {
  const ke = enPricing(cfg, "ke", { villa: 200000, duplex: 300000 });
  assert.equal(ke.price, "KES 8,892");
  assert.equal(ke.priceExact, "KES 8,892.42");
  assert.equal(ke.villa, "≈ KES 45,600");
  assert.equal(ke.duplex, "≈ KES 68,400");
  const gh = enPricing(cfg, "GH", { villa: 200000, duplex: 300000 });
  assert.equal(gh.priceExact, "GHS 796.01");
  assert.equal(gh.villa, "≈ GHS 4,080");
  assert.equal(enPricing(cfg, "FR", { villa: 1, duplex: 1 }).country, "KE");
  assert.equal(moneyEn(796.01, "GHS", true), "GHS 796");
});

test("fiches anglaises : uniquement des modèles connus, sans FCFA ni « duplex »", () => {
  const codes = Object.keys(plansEn.plans);
  assert.ok(codes.length >= 10);
  for (const [code, f] of Object.entries(plansEn.plans)) {
    assert.match(code, /^[VD]\d-\d{3}$/);
    assert.doesNotMatch(f.summary + f.description, /FCFA|[Dd]uplex/);
  }
});

test("page anglaise générée : pas de FCFA, paiement en anglais", () => {
  const html = readFileSync(new URL("../public/lp/en-premium-catalogue.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /FCFA/);
  assert.match(html, /lang:'en'/);
  assert.match(html, /<html lang="en"/);
});

import { defaultRate, planTextEn, publishedRates } from "../src/lib/premium-en.ts";
import costRates from "../src/config/cost-rates-en.json" with { type: "json" };

test("prix au m² publiés : Kenya par type de maison, Ghana sans niveau Basic, autre pays sans source", () => {
  const ke = publishedRates(costRates, "KE", 1)!;
  assert.deepEqual(ke.ranges.standard, [65000, 82000]);
  assert.equal(publishedRates(costRates, "KE", 2)!.ranges.basic![0], 45000);
  assert.equal(defaultRate(ke.ranges.standard), 73500);
  const gh = publishedRates(costRates, "gh", 1)!;
  assert.equal(gh.ranges.basic, undefined);
  assert.equal(defaultRate(gh.ranges.standard), 4850);
  assert.equal(defaultRate(gh.ranges.luxury), 7500);
  assert.equal(publishedRates(costRates, "NG", 1), null);
  assert.match(ke.url, /^https:\/\//);
});

test("textes anglais des fiches : lot traduit ou rien", () => {
  assert.match(planTextEn(plansEn, "V4-005")!.description, /201 square meters/);
  assert.equal(planTextEn(plansEn, "V9-999"), null);
});
