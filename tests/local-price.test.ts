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

test("offre aux clients : remise de 10 000 FCFA dans la monnaie du visiteur", async () => {
  const { discountedLocalPrice, formatLocalPrice: fmt } = await import("../src/lib/local-price.ts");
  const price = (amount: number, currency: string) => {
    const p = discountedLocalPrice({ amount, currency }, 14900, 10000);
    return fmt(p.amount, p.currency).replace(/\s/gu, " ");
  };
  assert.equal(price(14900, "FCFA"), "4 900 FCFA");
  assert.equal(price(15350, "FCFA"), "5 350 FCFA");
  assert.equal(price(235941, "GNF"), "77 591 GNF");
  assert.equal(price(26, "$US"), "8,55 $US");
});
