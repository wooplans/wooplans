import { test } from "node:test";
import assert from "node:assert/strict";
import { ago, cameroonDay, relanceCards, suggestedMessageId, type RelanceRow } from "../src/lib/chantier-relances-rules.ts";

const now = Date.parse("2026-11-25T09:00:00Z"); // 10 h au Cameroun
const H = 3_600_000;
const row = (o: Partial<RelanceRow>): RelanceRow => ({
  id: o.code ?? "x", code: "C-V3-AP-0001", name: "Paul", profile: "pret", houseType: "villa", bedrooms: "3", start: "asap",
  aiStep: "accueil", aiFollowUp: "2026-11-25", aiMessageId: "accueil-relance", aiUpdatedAt: now - 5 * H, clickedAt: null,
  lastIn: now - 20 * H, lastOut: now - 19 * H, leadStage: "qualification", ...o,
});

test("jour au Cameroun", () => {
  assert.equal(cameroonDay(Date.parse("2026-11-24T23:30:00Z")), "2026-11-25");
});

test("qui apparaît : a écrit, date arrivée ; pas les relances futures, les perdus, ni ceux déjà relancés aujourd'hui", () => {
  const cards = relanceCards(
    [
      row({ code: "ecrit", lastIn: now - H, lastOut: now - 2 * H, aiFollowUp: "2026-12-01" }),
      row({ code: "du" }),
      row({ code: "futur", aiFollowUp: "2026-11-27" }),
      row({ code: "perdu", aiStep: "perdu", aiFollowUp: null }),
      row({ code: "deja", lastOut: now - H, lastIn: now - 20 * H }),
      row({ code: "terrain", aiStep: "terrain", aiFollowUp: "2026-11-30" }),
      row({ code: "commande", aiStep: "proforma", leadStage: "commande" }),
    ],
    now,
  );
  assert.deepEqual(cards.map((c) => c.code), ["ecrit", "terrain", "du"]);
});

test("ordre : a écrit (plus ancien d'abord), engagé, proforma, terrain, chaud, tièdes ; retards, duplex, au plus tôt", () => {
  const cards = relanceCards(
    [
      row({ code: "tiede", profile: "bientot", aiStep: "attente" }),
      row({ code: "chaud-villa" }),
      row({ code: "chaud-duplex", houseType: "duplex" }),
      row({ code: "chaud-retard", aiFollowUp: "2026-11-22" }),
      row({ code: "proforma", aiStep: "proforma" }),
      row({ code: "engage", aiStep: "engage", leadStage: "commande" }),
      row({ code: "ecrit-recent", lastIn: now - H, lastOut: now - 3 * H }),
      row({ code: "ecrit-ancien", lastIn: now - 2 * H, lastOut: now - 3 * H }),
    ],
    now,
  );
  assert.deepEqual(cards.map((c) => c.code), ["ecrit-ancien", "ecrit-recent", "engage", "proforma", "chaud-retard", "chaud-duplex", "chaud-villa", "tiede"]);
});

test("clic : grisé en bas pendant 2 h, puis remonte ; disparaît quand le message part", () => {
  const clicked = relanceCards([row({ code: "a", clickedAt: now - 30 * 60_000 }), row({ code: "b", houseType: "villa", start: "6mois" })], now);
  assert.deepEqual(clicked.map((c) => [c.code, c.clicked]), [["b", false], ["a", true]]);
  assert.equal(relanceCards([row({ code: "a", clickedAt: now - 3 * H })], now)[0].clicked, false);
  assert.equal(relanceCards([row({ code: "a", clickedAt: now - 30 * 60_000, lastOut: now - 10 * 60_000 })], now).length, 0);
});

test("message proposé : celui de l'IA s'il est à jour, sinon selon l'étape ; rien si l'IA n'a pas lu le dernier message", () => {
  const [c] = relanceCards([row({})], now);
  assert.equal(suggestedMessageId(c), "accueil-relance");
  const [w] = relanceCards([row({ lastIn: now - H, aiUpdatedAt: now - 2 * H })], now);
  assert.equal(suggestedMessageId(w), null);
  const [n] = relanceCards([row({ lastIn: now - H, lastOut: null, aiStep: null, aiUpdatedAt: null, aiMessageId: null })], now);
  assert.equal(suggestedMessageId(n), "accueil");
  const [t] = relanceCards([row({ aiStep: "terrain", aiMessageId: null })], now);
  assert.equal(suggestedMessageId(t), "proforma");
});

test("ago", () => {
  assert.equal(ago(now - 5 * 60_000, now), "il y a 5 min");
  assert.equal(ago(now - 3 * H, now), "il y a 3 h");
  assert.equal(ago(now - 26 * H, now), "hier");
  assert.equal(ago(now - 80 * H, now), "il y a 3 j");
});
