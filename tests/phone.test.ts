import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePhone, phoneCountry, whatsappUrl } from "../src/lib/phone.ts";

test("numéro Chariow (objet avec indicatif déjà inclus)", () => {
  const phone = { number: 22676658258, country: { dial_code: "+226", code: "BF" } };
  assert.equal(normalizePhone(phone), "22676658258");
  assert.equal(phoneCountry(phone), "BF");
});

test("numéro local : ajout de l'indicatif du pays", () => {
  assert.equal(normalizePhone({ number: "653769998", country: { dial_code: "+237", code: "CM" } }), "237653769998");
});

test("texte libre, préfixe 00 et numéros inexploitables", () => {
  assert.equal(normalizePhone("+237 6 53 76 99 98"), "237653769998");
  assert.equal(normalizePhone("00225 07 07 07 07 07"), "2250707070707");
  assert.equal(normalizePhone("123"), null);
  assert.equal(normalizePhone(null), null);
});

test("lien WhatsApp", () => {
  assert.equal(whatsappUrl("+237 653 769 998", "Bonjour"), "https://wa.me/237653769998?text=Bonjour");
  assert.equal(whatsappUrl(""), null);
});
