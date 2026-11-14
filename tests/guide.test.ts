import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GUIDE_DELAYS_HOURS,
  guideKindForStep,
  isHotLead,
  parseHeardFrom,
  parseQualification,
  qualificationSummary,
} from "../src/lib/guide-rules.ts";
import config from "../src/config/guide.json" with { type: "json" };

test("prix du guide : 1 900 FCFA au plus, 100 modèles annoncés", () => {
  assert.ok(config.price > 0 && config.price <= 1900);
  assert.equal(config.announcedModels, 100);
});

test("qualification : seules les réponses prévues sont acceptées", () => {
  assert.deepEqual(parseQualification({ terrain: "titre", start: "3mois", budget: "25" }), { terrain: "titre", start: "3mois", budget: "25" });
  assert.equal(parseQualification({ terrain: "titre", start: "demain", budget: "25" }), null);
  assert.equal(parseQualification({}), null);
});

test("lead chaud : terrain et démarrage dans les 6 mois", () => {
  assert.equal(isHotLead({ terrain: "titre", start: "3mois", budget: "15" }), true);
  assert.equal(isHotLead({ terrain: "sans_titre", start: "6mois", budget: "plus" }), true);
  assert.equal(isHotLead({ terrain: "non", start: "3mois", budget: "40" }), false);
  assert.equal(isHotLead({ terrain: "titre", start: "12mois", budget: "40" }), false);
  assert.match(qualificationSummary({ terrain: "titre", start: "3mois", budget: "25" }), /titre foncier.*3 prochains mois.*15 à 25 millions/);
});

test("comment nous avez-vous connu : valeur inconnue ignorée", () => {
  assert.equal(parseHeardFrom("tiktok"), "tiktok");
  assert.equal(parseHeardFrom("<script>"), null);
});

test("séquence du guide : 7 emails sur 10 jours, dans l'ordre", () => {
  assert.equal(GUIDE_DELAYS_HOURS.length, 7);
  assert.equal(GUIDE_DELAYS_HOURS.at(-1), 240);
  assert.deepEqual([...GUIDE_DELAYS_HOURS].sort((a, b) => a - b), GUIDE_DELAYS_HOURS);
  assert.equal(guideKindForStep(0), "open");
  assert.equal(guideKindForStep(6), "last");
  assert.equal(guideKindForStep(42), "last");
});
