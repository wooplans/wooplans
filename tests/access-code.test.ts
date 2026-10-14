import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAccessCode, randomAccessCode } from "../src/lib/crypto.ts";

test("code au format XXXX-XXXX sans caractères ambigus", () => {
  for (let i = 0; i < 200; i++) {
    const code = randomAccessCode();
    assert.match(code, /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);
    assert.doesNotMatch(code, /[01ILO]/);
  }
});

test("la saisie est normalisée (minuscules, espaces, sans tiret)", () => {
  assert.equal(normalizeAccessCode(" k7pm q3xd "), "K7PM-Q3XD");
  assert.equal(normalizeAccessCode("k7pmq3xd"), "K7PM-Q3XD");
  assert.equal(normalizeAccessCode("K7PM-Q3XD"), "K7PM-Q3XD");
});
