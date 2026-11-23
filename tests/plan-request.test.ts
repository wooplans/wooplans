import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parsePlanRequestAnswers,
  planRequestRef,
  planRequestScore,
  planRequestSummary,
  planRequestTier,
  planRequestWhatsappText,
} from "../src/lib/plan-request-rules.ts";

const hot = { type: "duplex", terrain: "titre", start: "3m", budget: "30_50", ready: "now" };

test("plans complets : seules les réponses prévues sont acceptées", () => {
  assert.deepEqual(parsePlanRequestAnswers(hot), hot);
  assert.equal(parsePlanRequestAnswers({ ...hot, start: "demain" }), null);
  assert.equal(parsePlanRequestAnswers({ type: "villa" }), null);
});

test("plans complets : note sur 100 et palier", () => {
  assert.equal(planRequestScore(parsePlanRequestAnswers(hot)!), 100);
  assert.equal(planRequestTier(100), "chaud");
  const cold = parsePlanRequestAnswers({ type: "duplex", terrain: "non", start: "plus", budget: "lt15", ready: "later" })!;
  assert.equal(planRequestScore(cold), 0);
  assert.equal(planRequestTier(0), "froid");
  // Terrain sans titre, démarrage 3-6 mois, villa 15-30 M, étape 1 dans le mois : 25 + 25 + 20 + 5 = 75.
  const warm = parsePlanRequestAnswers({ type: "villa", terrain: "sans_titre", start: "6m", budget: "15_30", ready: "month" })!;
  assert.equal(planRequestScore(warm), 75);
  assert.equal(planRequestTier(69), "tiede");
  assert.equal(planRequestTier(40), "tiede");
  assert.equal(planRequestTier(39), "froid");
});

test("plans complets : résumé, référence et message WhatsApp sans la note", () => {
  const a = parsePlanRequestAnswers(hot)!;
  assert.match(planRequestSummary(a), /^Type : Duplex \(R\+1\) · Terrain : Oui, avec titre foncier · Démarrage/);
  assert.equal(planRequestRef("aB_9xYz"), "WP-AB9X");
  const text = planRequestWhatsappText({ ref: "WP-AB9X", name: "Awa Diallo", answers: a, plan: "D4-034", city: "Conakry" });
  assert.match(text, /^Bonjour WooPlans 👋 Je suis Awa\./);
  assert.match(text, /WP-AB9X/);
  assert.match(text, /modèle D4-034/);
  assert.match(text, /\(Conakry\)/);
  assert.doesNotMatch(text, /100|chaud|note/i);
});
