import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PROSPECT_SEQUENCE,
  emailKindForStep,
  sanitizeSequenceSettings,
  shouldStartSequence,
  stepDueAt,
} from "../src/lib/prospect-sequence.ts";

const H = 3_600_000;
const start = new Date("2026-10-16T10:00:00Z");

test("calendrier +1 h / +1 j / +3 j / +7 j puis fin", () => {
  const d = DEFAULT_PROSPECT_SEQUENCE.delaysHours;
  assert.equal(stepDueAt(start, 0, d)?.getTime(), start.getTime() + H);
  assert.equal(stepDueAt(start, 1, d)?.getTime(), start.getTime() + 24 * H);
  assert.equal(stepDueAt(start, 3, d)?.getTime(), start.getTime() + 168 * H);
  assert.equal(stepDueAt(start, 4, d), null);
});

test("démarrage : jamais démarrée oui, en cours non, terminée récemment non, terminée il y a longtemps oui", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  assert.equal(shouldStartSequence({ sequenceStartedAt: null, nextEmailAt: null, lastEmailAt: null }, now), true);
  assert.equal(shouldStartSequence({ sequenceStartedAt: start, nextEmailAt: new Date(), lastEmailAt: null }, now), false);
  assert.equal(shouldStartSequence({ sequenceStartedAt: start, nextEmailAt: null, lastEmailAt: new Date(now.getTime() - 5 * 24 * H) }, now), false);
  assert.equal(shouldStartSequence({ sequenceStartedAt: start, nextEmailAt: null, lastEmailAt: start }, now), true);
});

test("réglages de l'admin normalisés", () => {
  const s = sanitizeSequenceSettings({ delaysHours: [72, -1, 1, "x" as unknown as number, 24], discountCode: " w10 ", perRun: 500 });
  assert.deepEqual(s.delaysHours, [1, 24, 72]);
  assert.equal(s.discountCode, "W10");
  assert.equal(s.perRun, 100);
  assert.deepEqual(sanitizeSequenceSettings({ delaysHours: [] }).delaysHours, DEFAULT_PROSPECT_SEQUENCE.delaysHours);
});

test("contenu des emails : aide, valeur, offre, dernier rappel", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => emailKindForStep(i, 4, true)), ["help", "value", "offer", "last"]);
  assert.deepEqual([0, 1, 2, 3].map((i) => emailKindForStep(i, 4, false)), ["help", "value", "value", "last"]);
  assert.deepEqual([0, 1].map((i) => emailKindForStep(i, 2, true)), ["help", "value"]);
});
