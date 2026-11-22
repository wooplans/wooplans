import assert from "node:assert/strict";
import { test } from "node:test";
import { activePromo, chooseOffer, deadlineLabel, offerProductIds, reservedDeadline, reservedUntil, type CatalogueConfig } from "../src/lib/catalogue-offer-rules.ts";
import { endsText, offerMessagesOver, relanceDueAt } from "../src/lib/relance-schedule.ts";

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
      "2026-11-29T07:00:00.000Z",
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
