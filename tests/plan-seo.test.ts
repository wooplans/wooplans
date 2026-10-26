import assert from "node:assert/strict";
import { test } from "node:test";
import { isCacheablePageRequest } from "../src/lib/page-cache.ts";
import {
  LANDING_PAGES,
  landingFaq,
  landingPage,
  landingPagesFor,
  millionsRange,
  planFallbackDescription,
  planImageAlt,
  planSeoDescription,
  planSeoTitle,
  planStats,
  selectLandingPlans,
} from "../src/lib/plan-seo.ts";

const d4040 = { name: "Duplex D4-040", code: "D4-040", category: "duplex" as const, bedrooms: 4, bathrooms: 4, levels: 2, surfaceTotal: 155, landArea: null, budgetMin: 25_100_000, budgetMax: 30_700_000 };
const v3001 = { name: "Villa V3-001", code: "V3-001", category: "villa" as const, bedrooms: 3, bathrooms: 2, levels: 1, surfaceTotal: 92, landArea: 250, budgetMin: 10_600_000, budgetMax: 13_000_000 };
const d5001 = { name: "Duplex D5-001", code: "D5-001", category: "duplex" as const, bedrooms: 5, levels: 2, surfaceTotal: 325, landArea: 400, budgetMin: 52_700_000, budgetMax: 64_400_000 };

test("titre : la requête d'abord, la référence ensuite", () => {
  assert.equal(planSeoTitle(d4040), "Plan duplex moderne 4 chambres, 155 m² (D4-040)");
  assert.equal(planSeoTitle(v3001), "Plan villa moderne plain-pied 3 chambres, 92 m² (V3-001)");
});

test("description : budget en FCFA, terrain seulement s'il est connu", () => {
  assert.equal(
    planSeoDescription(d4040),
    "Duplex moderne R+1 de 4 chambres et 155 m² : rendus 3D de la façade, surfaces et budget de construction indicatif de 25 – 31 millions FCFA.",
  );
  assert.match(planSeoDescription(v3001), /11 – 13 millions FCFA\. Terrain conseillé : 250 m²\.$/);
});

test("texte alternatif et présentation générée accordés au genre", () => {
  assert.equal(planImageAlt(d4040), "Façade du duplex moderne 4 chambres, 155 m² (D4-040) — rendu 3D");
  assert.match(planImageAlt(v3001), /^Façade de la villa moderne plain-pied/);
  assert.match(planFallbackDescription(v3001), /^La Villa V3-001 est une villa .* Elle s'implante sur un terrain d'environ 250 m²\./);
  assert.match(planFallbackDescription(d4040), /^Le Duplex D4-040 est un duplex moderne sur 2 niveaux \(R\+1\) de 4 chambres et 4 salles de bain/);
  assert.match(planFallbackDescription({ ...d4040, budgetMax: null }), /est d'environ 25 millions FCFA, hors terrain/);
});

test("millionsRange", () => {
  assert.equal(millionsRange(10_600_000, 13_000_000), "11 – 13 millions FCFA");
  assert.equal(millionsRange(8_400_000, 9_000_000), "8,4 – 9 millions FCFA");
  assert.equal(millionsRange(null, null), null);
});

test("pages thématiques : sélection des modèles", () => {
  const plans = [d4040, v3001, d5001];
  assert.deepEqual(selectLandingPlans(plans, landingPage("/plan-duplex-4-chambres").select).map((p) => p.code), ["D4-040"]);
  assert.deepEqual(selectLandingPlans(plans, landingPage("/plan-duplex-5-chambres").select).map((p) => p.code), ["D5-001"]);
  assert.deepEqual(selectLandingPlans(plans, landingPage("/petit-duplex").select).map((p) => p.code), ["D4-040"]);
  assert.deepEqual(selectLandingPlans(plans, landingPage("/facade-duplex-moderne").select).map((p) => p.code), ["D4-040", "D5-001"]);
  assert.deepEqual(selectLandingPlans(plans, landingPage("/plan-villa-3-chambres").select).map((p) => p.code), ["V3-001"]);
  assert.throws(() => landingPage("/inconnue"));
});

test("liens thématiques depuis une fiche", () => {
  assert.deepEqual(landingPagesFor("duplex", 5).map((p) => p.path), ["/plan-duplex-5-chambres", "/petit-duplex", "/facade-duplex-moderne"]);
  assert.ok(!landingPagesFor("duplex", 4).some((p) => p.path === "/plan-duplex-5-chambres"));
  assert.deepEqual(landingPagesFor("villa", 4).map((p) => p.path), ["/plan-villa-4-chambres"]);
});

test("FAQ chiffrée à partir des modèles", () => {
  const stats = planStats([d4040, d5001]);
  assert.deepEqual(stats, { count: 2, surface: [155, 325], land: [400, 400], budget: [25_100_000, 64_400_000] });
  const faq = landingFaq(landingPage("/plan-duplex-4-chambres"), stats, 29000);
  assert.match(faq[0].answer, /de 25 à 64 millions FCFA, hors terrain/);
  assert.ok(faq.some((f) => f.answer.includes("(29 000 FCFA, paiement unique")));
  assert.equal(landingFaq(landingPage("/petit-duplex"), planStats([]), 29000).length, 2);
});

test("toutes les pages thématiques sont mises en cache", () => {
  for (const page of LANDING_PAGES) {
    assert.ok(isCacheablePageRequest("GET", new URL(`https://www.wooplans.com${page.path}`), new Headers()), page.path);
  }
});
