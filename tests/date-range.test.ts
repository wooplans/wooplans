import assert from "node:assert/strict";
import { test } from "node:test";
import { dayRange, localDay, parseRange, periodRange, shiftDay } from "../src/lib/date-range.ts";

test("jour précis : de minuit à minuit, heure du Cameroun (UTC+1)", () => {
  const r = dayRange("2026-10-20");
  assert.equal(r.since.toISOString(), "2026-10-19T23:00:00.000Z");
  assert.equal(r.until.toISOString(), "2026-10-20T23:00:00.000Z");
  assert.equal(r.days, 1);
  assert.equal(localDay(new Date("2026-10-19T23:30:00Z")), "2026-10-20");
});

test("période glissante : aujourd'hui compris", () => {
  const r = periodRange(7, new Date("2026-10-27T10:00:00Z"));
  assert.equal(r.since.toISOString(), "2026-10-20T23:00:00.000Z");
  assert.equal(r.until.toISOString(), "2026-10-27T23:00:00.000Z");
});

test("paramètres : jour valide prioritaire, sinon période connue, sinon 30 jours", () => {
  const now = new Date("2026-10-27T10:00:00Z");
  assert.equal(parseRange({ jour: "2026-10-01", jours: "7" }, now).day, "2026-10-01");
  assert.equal(parseRange({ jours: "90" }, now).days, 90);
  assert.equal(parseRange({ jours: "12" }, now).days, 30);
  assert.equal(parseRange({ jour: "hier" }, now).days, 30);
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
});
