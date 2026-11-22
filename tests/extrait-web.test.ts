import assert from "node:assert/strict";
import { test } from "node:test";
import { extraitLevel, extraitScore, maskedAmount, type ExtraitEvent } from "../src/lib/extrait-web-rules.ts";

const at = (d: string) => new Date(`${d}T10:00:00Z`);

test("score d'intérêt de l'extrait en ligne", () => {
  assert.equal(extraitScore([], ["a"]).score, 0);
  const events: ExtraitEvent[] = [
    { type: "open", planSlug: null, createdAt: at("2026-11-23") },
    { type: "open", planSlug: null, createdAt: at("2026-11-23") },
    { type: "open", planSlug: null, createdAt: at("2026-11-24") },
    { type: "view", planSlug: "a", createdAt: at("2026-11-23") },
    { type: "view", planSlug: "a", createdAt: at("2026-11-23") },
    { type: "view", planSlug: "z", createdAt: at("2026-11-23") },
    { type: "locked", planSlug: "z", createdAt: at("2026-11-23") },
    { type: "pdf", planSlug: "a", createdAt: at("2026-11-23") },
  ];
  const s = extraitScore(events, ["a"]);
  // 5 + 3 (2e jour) + 2 (a) + 3 (z verrouillée) + 5 (clic) + 2 (pdf)
  assert.equal(s.score, 20);
  assert.equal(s.opens, 2);
  assert.equal(s.viewed, 2);
  assert.equal(extraitLevel(s.score), "tiede");
  const hot = extraitScore([...events, { type: "offer", planSlug: null, createdAt: at("2026-11-24") }, ...Array(10).fill({ type: "locked", planSlug: "y", createdAt: at("2026-11-24") })], ["a"]);
  assert.equal(extraitLevel(hot.score), "chaud");
  assert.ok(hot.score <= 100);
});

test("devis verrouillé : aucun chiffre envoyé", () => {
  assert.equal(maskedAmount(1_250_000), "████ ███ FCFA");
  assert.doesNotMatch(maskedAmount(987_654), /\d/);
});
