import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLocalPrice, localPriceFor, type LocalPriceRule } from "../src/lib/local-price.ts";
import projet from "../src/config/projet.json" with { type: "json" };

const rules = projet.localPrices as LocalPriceRule[];
const base = { price: 14900, anchor: 50000 };

test("Afrique centrale et pays inconnus : prix de base en FCFA", () => {
  assert.deepEqual(localPriceFor("CM", base, rules), { amount: 14900, currency: "FCFA", anchor: 50000 });
  assert.deepEqual(localPriceFor("GA", base, rules), { amount: 14900, currency: "FCFA", anchor: 50000 });
  assert.deepEqual(localPriceFor(null, base, rules), { amount: 14900, currency: "FCFA", anchor: 50000 });
  assert.deepEqual(localPriceFor("FR", base, rules), { amount: 14900, currency: "FCFA", anchor: 50000 });
});

test("Afrique de l'Ouest : 15 350 FCFA", () => {
  for (const c of ["CI", "SN", "BJ", "TG", "BF", "ML", "NE", "ci"]) {
    const p = localPriceFor(c, base, rules);
    assert.equal(p.amount, 15350);
    assert.equal(p.currency, "FCFA");
    assert.equal(p.anchor, 51500);
  }
});

test("Guinée (GNF) et RD Congo ($US)", () => {
  const gn = localPriceFor("GN", base, rules);
  assert.equal(formatLocalPrice(gn.amount, gn.currency).replace(/\s/gu, " "), "235 941 GNF");
  assert.equal(gn.anchor, 792000);
  const cd = localPriceFor("CD", base, rules);
  assert.equal(formatLocalPrice(cd.amount, cd.currency), "26 $US");
  assert.equal(cd.anchor, 87);
});

test("sans prix barré : aucun prix barré converti", () => {
  assert.equal(localPriceFor("SN", { price: 14900, anchor: null }, rules).anchor, null);
});
