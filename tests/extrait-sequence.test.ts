import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTRAIT_DELAYS_HOURS, extraitKindForStep } from "../src/lib/guide-rules.ts";

test("extrait : 4 emails de conversion (J1, J2, J5, J7) puis le formulaire à J10", () => {
  assert.deepEqual(EXTRAIT_DELAYS_HOURS, [24, 48, 120, 168, 240]);
  assert.deepEqual(EXTRAIT_DELAYS_HOURS.map((_, i) => extraitKindForStep(i)), ["offre", "devis", "faq", "recap", "projet"]);
  assert.ok(EXTRAIT_DELAYS_HOURS.slice(0, 4).every((h) => h <= 7 * 24));
  assert.equal(EXTRAIT_DELAYS_HOURS[4], 10 * 24);
});
