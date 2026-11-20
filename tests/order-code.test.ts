import assert from "node:assert/strict";
import { test } from "node:test";
import { findOrderCode, merciWhatsappText, orderCode, samePhone } from "../src/lib/order-code.ts";

test("code de commande stable et retrouvé dans le message", () => {
  const code = orderCode("Abc_123-xyz");
  assert.match(code, /^WP-\d{6}$/);
  assert.equal(orderCode("Abc_123-xyz"), code);
  assert.notEqual(orderCode("autre-intention"), code);
  const text = merciWhatsappText({ product: "l'Extrait du Catalogue Premium", code, name: "Jean  Kouassi" });
  assert.ok(text.startsWith("Salut l'équipe WooPlans"));
  assert.ok(text.includes("Je suis Jean Kouassi."));
  assert.equal(findOrderCode(text), code);
  assert.equal(findOrderCode("commande wp 123456 svp"), "WP-123456");
  assert.equal(findOrderCode("bonjour"), null);
  assert.ok(!merciWhatsappText({ product: "x", code, name: null }).includes("Je suis"));
});

test("même numéro : exact, ou ancien format ivoirien à 8 chiffres", () => {
  assert.ok(samePhone("+2250544089680", "22544089680"));
  assert.ok(samePhone("+237 653 76 99 98", "237653769998"));
  assert.ok(!samePhone("+237653769998", "237694327885"));
  assert.ok(!samePhone("", "237694327885"));
});
