import assert from "node:assert/strict";
import { test } from "node:test";
import { activeFilterChips, applyPlanFilters, bedroomOptions, catalogueHref, cleanFilters, filterSummary, filtersFromSearch } from "../src/lib/plan-filters.ts";

const plans = [
  { id: "a", category: "villa" as const, bedrooms: 3, levels: 1, budgetMin: 18_000_000, budgetMax: 22_000_000, landArea: 300 },
  { id: "b", category: "duplex" as const, bedrooms: 4, levels: 2, budgetMin: 35_000_000, budgetMax: 40_000_000, landArea: 400 },
  { id: "c", category: "villa" as const, bedrooms: 5, levels: 1, budgetMin: null, budgetMax: null, landArea: null },
];

test("filtre par catégorie, chambres (5 = 5 et plus), niveaux", () => {
  assert.deepEqual(applyPlanFilters(plans, { categorie: "villa" }).map((p) => p.id), ["a", "c"]);
  assert.deepEqual(applyPlanFilters(plans, { chambres: "5" }).map((p) => p.id), ["c"]);
  assert.deepEqual(applyPlanFilters(plans, { niveaux: "2" }).map((p) => p.id), ["b"]);
});

test("budget et terrain excluent les modèles sans donnée", () => {
  assert.deepEqual(applyPlanFilters(plans, { budget: "30" }).map((p) => p.id), ["a"]);
  assert.deepEqual(applyPlanFilters(plans, { terrain: "400" }).map((p) => p.id), ["a", "b"]);
});

test("URL, puces et options de chambres de la vitrine", () => {
  assert.equal(catalogueHref({}), "/catalogue");
  assert.equal(catalogueHref({ categorie: "", chambres: "", budget: "30" }), "/catalogue?budget=30");
  assert.equal(catalogueHref({ q: "V3", categorie: "villa" }, "/espace-premium"), "/espace-premium?q=V3&categorie=villa");
  assert.deepEqual(cleanFilters({ categorie: "villa", niveaux: "", budget: undefined }), { categorie: "villa" });
  assert.deepEqual(
    activeFilterChips({ categorie: "duplex", budget: "45", chambres: "5" }).map((c) => c.label),
    ["Duplex", "Budget ≤ 45 M FCFA", "5 chambres et +"],
  );
  assert.deepEqual(bedroomOptions([{ bedrooms: 4 }, { bedrooms: 3 }, { bedrooms: 6 }, { bedrooms: 5 }]).map((o) => o.value), ["3", "4", "5"]);
});

test("recherche par référence ou nom", () => {
  const named = [
    { ...plans[0], code: "V3-037", name: "Villa V3-037" },
    { ...plans[1], code: "D4-001", name: "Duplex D4-001" },
  ];
  assert.deepEqual(applyPlanFilters(named, { q: " v3-0 " }).map((p) => p.id), ["a"]);
  assert.deepEqual(applyPlanFilters(named, { q: "duplex" }).map((p) => p.id), ["b"]);
});

test("filtres relus depuis l'adresse, comme catalogueHref les écrit", () => {
  const filters = { categorie: "villa", chambres: "4", budget: "30" };
  assert.deepEqual(filtersFromSearch(new URL(`https://x${catalogueHref(filters)}`).search), filters);
  assert.deepEqual(filtersFromSearch("?categorie=&utm_source=fb"), {});
});

test("résumé court des filtres pour la barre de rappel", () => {
  assert.equal(filterSummary({}), "Tous les plans");
  assert.equal(filterSummary({ categorie: "duplex", budget: "30", chambres: "4" }), "Duplex · ≤ 30 M · 4 ch.");
  assert.equal(filterSummary({ chambres: "5", q: " V3 " }), "« V3 » · 5 ch. +");
});
