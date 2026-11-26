import assert from "node:assert/strict";
import { test } from "node:test";
import { activePromo, chooseOffer, deadlineLabel, offerProductIds, reservedDeadline, reservedUntil, type CatalogueConfig } from "../src/lib/catalogue-offer-rules.ts";
import { currentStep, endsText, greeting, offerMessagesOver, relanceDueAt } from "../src/lib/relance-schedule.ts";

const cfg: CatalogueConfig = {
  price: 39000,
  productId: "prd_pub",
  reserved: { price: 29000, productId: "prd_res", days: 7 },
  promo: { price: 19000, productId: "prd_promo" },
  promos: [{ id: "noel", from: "2026-12-20", to: "2026-12-26" }],
};

test("prix réservé : jusqu'à minuit UTC à la fin de J7", () => {
  const bought = new Date("2026-11-22T15:30:00Z");
  assert.equal(reservedDeadline(bought).toISOString(), "2026-11-30T00:00:00.000Z");
  assert.equal(deadlineLabel(reservedDeadline(bought)), "dimanche 29 novembre à minuit");
});

test("réouverture 24 h : la date la plus tardive l'emporte", () => {
  const bought = new Date("2026-11-01T10:00:00Z");
  const reopen = new Date("2026-11-23T09:15:00Z");
  assert.equal(reservedUntil(bought, reopen)?.toISOString(), reopen.toISOString());
  assert.equal(deadlineLabel(reopen), "lundi 23 novembre à 09 h 15");
  assert.equal(reservedUntil(null, null), null);
});

test("offre choisie : promo datée, sinon réservé en cours, sinon public", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  assert.deepEqual(chooseOffer(cfg, {}, now), { tier: "public", price: 39000, productId: "prd_pub", until: null });
  assert.equal(chooseOffer(cfg, { reservedUntil: new Date("2026-11-30T00:00:00Z") }, now).productId, "prd_res");
  assert.equal(chooseOffer(cfg, { reservedUntil: new Date("2026-11-24T00:00:00Z") }, now).tier, "public");
  const promo = activePromo(cfg.promos, "NOEL", new Date("2026-12-26T23:59:00Z"));
  assert.equal(chooseOffer(cfg, { promo }, now).price, 19000);
  assert.equal(activePromo(cfg.promos, "noel", new Date("2026-12-27T00:00:00Z")), null);
  assert.equal(activePromo(cfg.promos, "noel", new Date("2026-12-19T23:00:00Z")), null);
  assert.deepEqual(offerProductIds(cfg), ["prd_pub", "prd_res", "prd_promo"]);
});

test("5 relances WhatsApp calées sur l'achat (J0, J1, J4, J7 matin, J7 soir)", () => {
  const bought = new Date("2026-11-22T15:30:00Z");
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((s) => relanceDueAt(bought, s).toISOString()),
    [
      "2026-11-22T15:30:00.000Z",
      "2026-11-23T15:30:00.000Z",
      "2026-11-26T08:00:00.000Z",
      "2026-11-29T00:00:00.000Z",
      "2026-11-29T19:00:00.000Z",
      "2026-11-30T00:00:00.000Z",
    ],
  );
  const until = reservedDeadline(bought);
  assert.equal(offerMessagesOver(1, null), false);
  assert.equal(offerMessagesOver(2, until, new Date("2026-11-29T20:00:00Z")), false);
  assert.equal(offerMessagesOver(2, until, new Date("2026-11-30T00:00:00Z")), true);
  assert.equal(endsText(until, deadlineLabel(until), new Date("2026-11-29T19:00:00Z")), "ce soir à minuit");
  assert.equal(endsText(until, deadlineLabel(until), new Date("2026-11-28T19:00:00Z")), "le dimanche 29 novembre à minuit");
});

test("leads arrivés avant les 5 messages : avancés à l'étape de leur date de fin", () => {
  const bought = new Date("2026-11-16T10:00:00Z"); // fin : lundi 23 novembre à minuit (début du 24)
  const until = reservedDeadline(bought);
  // Message 2 envoyé (waStep 2), on est le 23 au matin : dernier jour (message 4 = étape 3).
  assert.equal(currentStep(2, bought, until, new Date("2026-11-23T00:40:00Z")), 3);
  assert.equal(currentStep(1, bought, until, new Date("2026-11-23T08:00:00Z")), 3);
  // 23 à 20 h : message 5 (étape 4) ; après minuit : séquence finie (5).
  assert.equal(currentStep(2, bought, until, new Date("2026-11-23T19:30:00Z")), 4);
  assert.equal(currentStep(3, bought, until, new Date("2026-11-24T00:10:00Z")), 5);
  // J2 : rien à avancer ; J5 : rappel (étape 2) ; livraison jamais sautée.
  assert.equal(currentStep(1, bought, until, new Date("2026-11-18T09:00:00Z")), 1);
  assert.equal(currentStep(1, bought, until, new Date("2026-11-21T09:00:00Z")), 2);
  assert.equal(currentStep(0, bought, until, new Date("2026-11-23T09:00:00Z")), 0);
  // Offre rouverte 24 h : la fin suit la réouverture.
  const reopen = new Date("2026-11-25T15:00:00Z");
  assert.equal(currentStep(4, bought, reopen, new Date("2026-11-25T08:00:00Z")), 4);
});

test("Bonjour / Bonsoir à partir de 16 h, heure du pays", () => {
  assert.equal(greeting("CI", new Date("2026-11-23T15:59:00Z")), "Bonjour");
  assert.equal(greeting("CI", new Date("2026-11-23T16:00:00Z")), "Bonsoir");
  assert.equal(greeting("CM", new Date("2026-11-23T15:10:00Z")), "Bonsoir");
  assert.equal(greeting(null, new Date("2026-11-23T08:00:00Z")), "Bonjour");
});

test("pays UEMOA : prix public payé via le produit à 37 864 (39 000 XOF affiché par Chariow)", async () => {
  const { chooseOffer, productForCountry, offerProductIds } = await import("../src/lib/catalogue-offer-rules");
  const cfg = {
    price: 39000, productId: "prd_pub", reserved: { price: 29000, productId: "prd_res", days: 7 },
    promo: { price: 19000, productId: "prd_promo" }, promos: [], uemoa: { productId: "prd_uemoa", countries: ["CI", "SN"] },
  };
  const pub = chooseOffer(cfg, {});
  assert.equal(productForCountry(cfg, pub, "ci"), "prd_uemoa");
  assert.equal(productForCountry(cfg, pub, "CM"), "prd_pub");
  const res = chooseOffer(cfg, { reservedUntil: new Date(Date.now() + 86400000) });
  assert.equal(productForCountry(cfg, res, "CI"), "prd_res");
  assert.ok(offerProductIds(cfg).includes("prd_uemoa"));
  assert.equal(productForCountry({ ...cfg, uemoa: { productId: "", countries: ["CI"] } }, pub, "CI"), "prd_pub");
});
