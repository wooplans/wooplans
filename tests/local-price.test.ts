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

test("offre aux clients : prix avec PROMO10 tels que Chariow les facture", async () => {
  const { discountedLocalPrice, formatLocalPrice: fmt } = await import("../src/lib/local-price.ts");
  const price = (local: { amount: number; currency: string; promoAmount?: number }) => {
    const p = discountedLocalPrice(local, 14900, 10000);
    return fmt(p.amount, p.currency).replace(/\s/gu, " ");
  };
  // Afrique centrale : remise déduite du prix de base.
  assert.equal(price({ amount: 14900, currency: "FCFA" }), "4 900 FCFA");
  // Prix relevés sur Chariow (src/config/projet.json).
  assert.equal(price({ amount: 15350, currency: "FCFA", promoAmount: 5050 }), "5 050 FCFA");
  assert.equal(price({ amount: 235941, currency: "GNF", promoAmount: 77591 }), "77 591 GNF");
  assert.equal(price({ amount: 26, currency: "$US", promoAmount: 8.59 }), "8,59 $US");
  // Sans relevé : remise convertie au taux du prix local.
  assert.equal(price({ amount: 15350, currency: "FCFA" }), "5 048 FCFA");
});

test("offre aux clients : les prix relevés passent par localPriceFor", () => {
  const rules: LocalPriceRule[] = [{ countries: ["SN"], amount: 15350, currency: "FCFA", promoAmount: 5050 }];
  assert.equal(localPriceFor("SN", { price: 14900, anchor: null }, rules).promoAmount, 5050);
  assert.equal(localPriceFor("CM", { price: 14900, anchor: null }, rules).promoAmount, undefined);
});
