import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTRAIT_DELAYS_HOURS, EXTRAIT_PROJECT_STEP, extraitKindForStep } from "../src/lib/guide-rules.ts";

test("extrait : 3 emails de conversion (J1, J4, J7) au rythme des WhatsApp, puis le formulaire à J10", () => {
  assert.deepEqual(EXTRAIT_DELAYS_HOURS, [24, 96, 168, 240]);
  assert.deepEqual(EXTRAIT_DELAYS_HOURS.map((_, i) => extraitKindForStep(i)), ["offre", "rappel", "dernier", "projet"]);
  assert.equal(extraitKindForStep(EXTRAIT_PROJECT_STEP), "projet");
  assert.ok(EXTRAIT_DELAYS_HOURS.slice(0, 3).every((h) => h <= 7 * 24));
  assert.equal(EXTRAIT_DELAYS_HOURS[EXTRAIT_PROJECT_STEP], 10 * 24);
});
