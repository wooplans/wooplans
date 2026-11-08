import assert from "node:assert/strict";
import { test } from "node:test";
import { anchorPriceFor, formatAmount } from "../src/lib/anchor-price.ts";

test("prix d'ancrage : affiché seulement s'il est supérieur au prix", () => {
  assert.equal(anchorPriceFor(14900, 50000), 50000);
  assert.equal(anchorPriceFor(14900, 14900), null);
  assert.equal(anchorPriceFor(14900, 10000), null);
  assert.equal(anchorPriceFor(14900, undefined), null);
  assert.equal(anchorPriceFor(14900, "50000"), null);
});

test("montant formaté à la française", () => {
  assert.equal(formatAmount(50000), "50 000");
});
