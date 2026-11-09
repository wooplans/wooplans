import assert from "node:assert/strict";
import { test } from "node:test";
import { discountedOffrePrice, OFFRE_DELAYS_HOURS, offreKindForStep, stepDueAt } from "../src/lib/prospect-sequence.ts";
import { isRelanceCode, relanceDiscount, type OffresConfig } from "../src/lib/offres-rules.ts";

test("relance des offres : 4 emails, la réduction au dernier seulement", () => {
  assert.deepEqual(OFFRE_DELAYS_HOURS.map((_, i) => offreKindForStep(i)), ["help", "value", "faq", "last"]);
  const start = new Date("2026-11-10T08:00:00Z");
  assert.equal(stepDueAt(start, 0, OFFRE_DELAYS_HOURS)?.toISOString(), "2026-11-10T09:00:00.000Z");
  assert.equal(stepDueAt(start, 3, OFFRE_DELAYS_HOURS)?.toISOString(), "2026-11-15T08:00:00.000Z");
  assert.equal(stepDueAt(start, 4, OFFRE_DELAYS_HOURS), null);
});

test("prix réduit : 10 000 FCFA de moins, jamais négatif", () => {
  assert.equal(discountedOffrePrice(39000, 10000), 29000);
  assert.equal(discountedOffrePrice(19000, 10000), 9000);
  assert.equal(discountedOffrePrice(5000, 10000), 0);
});

test("code de relance : configuré, insensible à la casse", () => {
  const cfg: OffresConfig = { default: "39k", offres: [], relance: { code: "relance10", discount: 10000 } };
  assert.deepEqual(relanceDiscount(cfg), { code: "RELANCE10", discount: 10000 });
  assert.equal(isRelanceCode("Relance10", cfg), true);
  assert.equal(isRelanceCode("PROMO10", cfg), false);
  assert.equal(relanceDiscount({ default: "39k", offres: [] }), null);
  assert.equal(relanceDiscount({ default: "39k", offres: [], relance: { code: " ", discount: 10000 } }), null);
});
