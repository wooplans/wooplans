import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTRAIT_DELAYS_HOURS, extraitKindForStep } from "../src/lib/guide-rules.ts";

test("extrait : 4 emails de conversion à J1, J2, J5, J7", () => {
  assert.deepEqual(EXTRAIT_DELAYS_HOURS, [24, 48, 120, 168]);
  assert.deepEqual(EXTRAIT_DELAYS_HOURS.map((_, i) => extraitKindForStep(i)), ["offre", "devis", "faq", "recap"]);
  assert.ok(EXTRAIT_DELAYS_HOURS.every((h) => h <= 7 * 24));
});
