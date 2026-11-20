import assert from "node:assert/strict";
import { test } from "node:test";
import { isBurningProject, parseProjectAnswers, projectRedirectPath, projectScore, projectSummary } from "../src/lib/project-form.ts";

test("formulaire Mon projet : validation, note, redirection", () => {
  const a = parseProjectAnswers({ terrain: "oui", start: "6m", budget: "15_30", type: "villa" })!;
  assert.ok(a);
  assert.equal(projectScore(a), 40);
  assert.ok(isBurningProject(a));
  assert.ok(projectRedirectPath(a).startsWith("/catalogue-villa?"));
  assert.ok(projectRedirectPath({ type: "duplex" }).startsWith("/catalogue-duplex?"));
  assert.ok(projectRedirectPath({ type: "nsp" }).startsWith("/catalogue?"));
  assert.equal(projectSummary(a), "Terrain : Oui · Démarrage : Moins de 6 mois · Budget : 15 à 30 M · Type : Villa");
  assert.equal(parseProjectAnswers({ terrain: "oui", start: "6m", budget: "15_30" }), null);
  assert.equal(parseProjectAnswers({ terrain: "x", start: "6m", budget: "15_30", type: "villa" }), null);
  const b = parseProjectAnswers({ terrain: "pas_encore", start: "nsp", budget: "lt15", type: "nsp" })!;
  assert.equal(projectScore(b), 0);
  assert.ok(!isBurningProject(b));
});
