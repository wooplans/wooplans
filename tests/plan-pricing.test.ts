import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_COST_SETTINGS,
  ESTIMATE_POSTS,
  budgetRange,
  computeEstimate,
  computeLand,
  derivedPlanFields,
  normalizeCostSettings,
} from "../src/lib/plan-pricing.ts";

test("terrain : bâtiment + 3 m × + 7 m, surface arrondie au multiple de 50 inférieur", () => {
  assert.deepEqual(computeLand(10, 13), { landWidth: 13, landDepth: 20, landArea: 250 }); // 260 m² → 250
  assert.deepEqual(computeLand(10, 14), { landWidth: 13, landDepth: 21, landArea: 250 }); // 273 m² → 250
  assert.deepEqual(computeLand(12.5, 18), { landWidth: 15.5, landDepth: 25, landArea: 350 }); // 387,5 m² → 350
  assert.equal(computeLand(null, 13), null);
  assert.equal(computeLand(10, 0), null);
});

test("les postes font 100 % et reprennent la répartition du catalogue (gros œuvre 45 %)", () => {
  for (const posts of Object.values(ESTIMATE_POSTS)) {
    assert.equal(posts.reduce((sum, p) => sum + p.share, 0), 10000);
    assert.equal(posts.slice(0, -5).reduce((sum, p) => sum + p.share, 0), 4500);
  }
});

test("devis = surface × prix au m² × coefficient de standing, somme des postes = total", () => {
  const standard = computeEstimate("villa", 116, "standard", DEFAULT_COST_SETTINGS)!;
  assert.equal(standard.total, 23_200_000);
  assert.equal(standard.lots[0].amount, 2_923_200); // fondation 12,6 %
  assert.equal(standard.lots.reduce((sum, l) => sum + l.amount, 0), standard.total);

  assert.equal(computeEstimate("villa", 116, "bas", DEFAULT_COST_SETTINGS)!.total, 18_560_000);
  assert.equal(computeEstimate("villa", 116, "eleve", DEFAULT_COST_SETTINGS)!.total, 27_840_000);

  const duplex = computeEstimate("duplex", 204, "standard", DEFAULT_COST_SETTINGS)!;
  assert.equal(duplex.total, 40_800_000);
  assert.equal(duplex.lots.length, 10);
  assert.equal(duplex.lots.reduce((sum, l) => sum + l.amount, 0), duplex.total);

  assert.equal(computeEstimate("immeuble", 400, "standard", DEFAULT_COST_SETTINGS), null);
  assert.equal(computeEstimate("villa", 0, "standard", DEFAULT_COST_SETTINGS), null);
});

test("le prix au m² des réglages s'applique par catégorie", () => {
  const cost = normalizeCostSettings({ ratePerM2: { villa: 180_000, duplex: 220_000 } });
  assert.equal(computeEstimate("villa", 100, "standard", cost)!.total, 18_000_000);
  assert.equal(computeEstimate("duplex", 100, "standard", cost)!.total, 22_000_000);
  assert.deepEqual(cost.standingCoef, DEFAULT_COST_SETTINGS.standingCoef);
});

test("réglages invalides ou absents : valeurs par défaut", () => {
  assert.deepEqual(normalizeCostSettings(null), DEFAULT_COST_SETTINGS);
  assert.deepEqual(normalizeCostSettings({ standingCoef: { bas: -1, eleve: "1,5" } }), DEFAULT_COST_SETTINGS);
});

test("champs calculés : budget ± 10 %, terrain seulement avec les dimensions du bâtiment", () => {
  assert.deepEqual(budgetRange(23_200_000), { budgetMin: 20_900_000, budgetMax: 25_500_000 });
  const villa = derivedPlanFields({ category: "villa", surfaceTotal: 116, standing: "standard", buildingWidth: 10, buildingDepth: 13 }, DEFAULT_COST_SETTINGS);
  assert.equal(villa.landArea, 250);
  assert.equal(villa.estimateTotal, 23_200_000);
  assert.equal(villa.budgetMin, 20_900_000);
  const other = derivedPlanFields({ category: "immeuble", surfaceTotal: 400, standing: null, buildingWidth: null, buildingDepth: null }, DEFAULT_COST_SETTINGS);
  assert.deepEqual(other, {});
});
