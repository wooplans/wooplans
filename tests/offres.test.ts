import assert from "node:assert/strict";
import { test } from "node:test";
import { offreProductIds, offresEnabled, resolveOffre, type OffresConfig } from "../src/lib/offres-rules.ts";

const cfg: OffresConfig = {
  default: "39k",
  offres: [
    { id: "39k", price: 39000, anchor: null, chariowProductId: "prd_39", countries: ["CI"] },
    { id: "29k", price: 29000, anchor: null, chariowProductId: "prd_29", countries: ["GN"] },
    { id: "19k", price: 19000, anchor: null, chariowProductId: "", countries: ["CM"] },
  ],
};

test("offre : le lien de la pub passe avant le pays", () => {
  assert.equal(resolveOffre("29k", "CI", cfg)?.id, "29k");
  assert.equal(resolveOffre("29K", null, cfg)?.id, "29k");
});

test("offre : sinon le pays, sinon l'offre par défaut", () => {
  assert.equal(resolveOffre(null, "GN", cfg)?.id, "29k");
  assert.equal(resolveOffre(null, "gn", cfg)?.id, "29k");
  assert.equal(resolveOffre(null, "SN", cfg)?.id, "39k");
  assert.equal(resolveOffre("inconnue", "SN", cfg)?.id, "39k");
  assert.equal(resolveOffre(null, null, cfg)?.id, "39k");
});

test("offre sans produit Chariow : inactive, plan et devis seul", () => {
  assert.equal(resolveOffre(null, "CM", cfg), null);
  assert.equal(resolveOffre("19k", "CI", cfg), null);
  const none: OffresConfig = { default: "39k", offres: cfg.offres.map((o) => ({ ...o, chariowProductId: "" })) };
  assert.equal(offresEnabled(none), false);
  assert.equal(resolveOffre(null, "CI", none), null);
});

test("produits Chariow reconnus : offres actives seulement", () => {
  const ids = offreProductIds(cfg);
  assert.deepEqual([...ids.keys()], ["prd_39", "prd_29"]);
  assert.equal(ids.get("prd_29")?.price, 29000);
  assert.equal(offresEnabled(cfg), true);
});

test("configuration réelle : pays de chaque offre, 19k seulement par lien", async () => {
  const { default: real } = await import("../src/config/offres.json", { with: { type: "json" } });
  const cfg = real as OffresConfig;
  for (const c of ["GN", "CI", "SN", "FR", "US"]) assert.equal(resolveOffre(null, c, cfg)?.id, "39k", c);
  for (const c of ["CM", "GA", "CD", "TG", "BJ", "ML"]) assert.equal(resolveOffre(null, c, cfg)?.id, "29k", c);
  assert.equal(resolveOffre("19k", "CI", cfg)?.id, "19k");
  assert.ok(cfg.offres.every((o) => !o.countries.some((c) => cfg.offres.some((x) => x !== o && x.countries.includes(c)))), "pays en double");
});
