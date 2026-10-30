import assert from "node:assert/strict";
import { test } from "node:test";
import { PLAN_RELANCE_DELAYS_HOURS, firstRelanceAt, nextRelanceAt } from "../src/lib/plan-relance-schedule.ts";

const H = 3_600_000;
const abandon = new Date("2026-10-30T10:00:00Z");

test("relance du plan et devis : +1 h puis +24 h, puis fin", () => {
  const first = firstRelanceAt(abandon);
  assert.equal(first.getTime(), abandon.getTime() + H);
  const second = nextRelanceAt(first, 0, first, PLAN_RELANCE_DELAYS_HOURS);
  assert.equal(second?.getTime(), abandon.getTime() + 24 * H);
  assert.equal(nextRelanceAt(second!, 1, second!, PLAN_RELANCE_DELAYS_HOURS), null);
});

test("un premier email envoyé en retard laisse au moins 12 h avant le suivant", () => {
  const first = firstRelanceAt(abandon);
  const late = new Date(abandon.getTime() + 20 * H);
  assert.equal(nextRelanceAt(first, 0, late)?.getTime(), late.getTime() + 12 * H);
});
