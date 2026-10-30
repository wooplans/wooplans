import assert from "node:assert/strict";
import { test } from "node:test";
import { AFTER_SALE_DAYS, afterSaleDueAt, afterSaleNextAt } from "../src/lib/after-sale-schedule.ts";
import { WELCOME_DELAYS_HOURS, welcomeKindForStep } from "../src/lib/prospect-sequence.ts";

const DAY = 86_400_000;
const bought = new Date("2026-11-01T09:00:00Z");

test("après l'achat : J+3, J+17, J+47, J+107 puis fin", () => {
  assert.deepEqual(
    AFTER_SALE_DAYS.map((_, i) => (afterSaleDueAt(bought, i)!.getTime() - bought.getTime()) / DAY),
    [3, 17, 47, 107],
  );
  assert.equal(afterSaleDueAt(bought, 4), null);
});

test("un envoi en retard laisse au moins 10 jours avant le suivant", () => {
  const sentLate = new Date(bought.getTime() + 15 * DAY);
  const next = afterSaleNextAt(bought, 0, sentLate)!;
  assert.equal(next.getTime(), sentLate.getTime() + 10 * DAY);
  assert.equal(afterSaleNextAt(bought, 3, new Date()), null);
});

test("bienvenue : 4 emails après le cadeau, le dernier propose le catalogue", () => {
  assert.equal(WELCOME_DELAYS_HOURS.length, 4);
  assert.equal(welcomeKindForStep(0), "guide");
  assert.equal(welcomeKindForStep(3), "last");
});
