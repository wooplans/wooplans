import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCountdown, msUntilDayEnd } from "../src/lib/daily-deadline.ts";

test("échéance : 23h59m59 du jour même, puis repart le lendemain", () => {
  assert.equal(msUntilDayEnd(new Date(2026, 10, 8, 23, 0, 0, 0)), 3_600_000);
  assert.equal(msUntilDayEnd(new Date(2026, 10, 8, 0, 0, 0, 0)), 86_400_000);
  assert.ok(msUntilDayEnd(new Date(2026, 10, 8, 23, 59, 59, 999)) > 0);
});

test("compte à rebours formaté HH:MM:SS", () => {
  assert.equal(formatCountdown(3_723_000), "01:02:03");
  assert.equal(formatCountdown(0), "00:00:00");
  assert.equal(formatCountdown(-5), "00:00:00");
});
