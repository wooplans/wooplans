import { test } from "node:test";
import assert from "node:assert/strict";
import { cohortConversion, heatLevel, leadHeat, type HeatSignals } from "../src/lib/lead-heat-rules.ts";

const now = new Date("2026-11-24T12:00:00Z");
const base: HeatSignals = { wrote: false, inbound: 0, read: false, clicked: false, video: null, extrait: null, checkout: false, ai: null, lastActionAt: now };

test("aucune réaction : froid", () => {
  const h = leadHeat({ ...base, lastActionAt: null }, now);
  assert.equal(h.score, 0);
  assert.equal(h.level, "froid");
  assert.deepEqual(h.reasons, ["aucune réaction pour l'instant"]);
});

test("lit sans réagir : reste froid", () => {
  const h = leadHeat({ ...base, read: true }, now);
  assert.equal(h.level, "froid");
  assert.ok(h.reasons.includes("lit sans réagir"));
});

test("paiement commencé + vidéo vue en entier : brûlant", () => {
  const h = leadHeat({ ...base, checkout: true, video: "end" }, now);
  assert.equal(h.score, 65);
  assert.equal(h.level, "brulant");
});

test("a écrit et cliqué : chaud", () => {
  const h = leadHeat({ ...base, wrote: true, inbound: 3, clicked: true }, now);
  assert.equal(h.score, 28);
  assert.equal(h.level, "tiede");
  const h2 = leadHeat({ ...base, wrote: true, inbound: 3, clicked: true, video: "half" }, now);
  assert.equal(h2.level, "chaud");
});

test("une action vieille de plus d'une semaine compte moitié", () => {
  const old = new Date(now.getTime() - 9 * 86_400_000);
  assert.equal(leadHeat({ ...base, checkout: true, video: "end", lastActionAt: old }, now).score, 33);
});

test("la note de l'IA pèse un quart", () => {
  assert.equal(leadHeat({ ...base, clicked: true, ai: 80 }, now).score, Math.round(12 * 0.75 + 80 * 0.25));
});

test("seuils", () => {
  assert.equal(heatLevel(60), "brulant");
  assert.equal(heatLevel(35), "chaud");
  assert.equal(heatLevel(12), "tiede");
  assert.equal(heatLevel(11), "froid");
});

test("passage au catalogue : seulement les séquences terminées, achat jusqu'à 24 h après la fin", () => {
  const d = (s: string) => new Date(s);
  const r = cohortConversion(
    [
      { until: d("2026-11-20T00:00:00Z"), convertedAt: d("2026-11-19T10:00:00Z") },
      { until: d("2026-11-20T00:00:00Z"), convertedAt: d("2026-11-20T20:00:00Z") },
      { until: d("2026-11-20T00:00:00Z"), convertedAt: d("2026-11-23T10:00:00Z") },
      { until: d("2026-11-21T00:00:00Z"), convertedAt: null },
      { until: d("2026-11-30T00:00:00Z"), convertedAt: d("2026-11-22T10:00:00Z") },
    ],
    now,
  );
  assert.deepEqual(r, { ended: 4, converted: 2, rate: 0.5 });
});
