import assert from "node:assert/strict";
import { test } from "node:test";
import { formalName, guessCivilite, salutation } from "../src/lib/civilite.ts";

test("civilité déduite du prénom, dans n'importe quel ordre", () => {
  assert.equal(guessCivilite("thomas meye"), "M.");
  assert.equal(guessCivilite("Bah Souleymane"), "M.");
  assert.equal(guessCivilite("BALDE Mamadou Bassirou"), "M.");
  assert.equal(guessCivilite("Jean-Joël DAKOURI"), "M.");
  assert.equal(guessCivilite("Fatou Fatou"), "Mme");
  assert.equal(guessCivilite("sahadatou soumana"), "Mme");
  assert.equal(guessCivilite("Aïcha Koné"), "Mme");
  assert.equal(guessCivilite("Marie-Claire Yao"), "Mme");
  assert.equal(guessCivilite("Saidou Diallo"), "M.");
  assert.equal(guessCivilite("Doum mido"), null);
  assert.equal(guessCivilite(null), null);
});

test("nom affiché proprement", () => {
  assert.equal(formalName("KONE KONE"), "Kone");
  assert.equal(formalName("n’da vincent"), "N’Da Vincent");
  assert.equal(formalName("Jean-joël DAKOURI"), "Jean-Joël Dakouri");
  assert.equal(salutation("thomas meye"), "M. Thomas Meye");
  assert.equal(salutation("Fatou Fatou"), "Mme Fatou");
  assert.equal(salutation("Doum mido"), "Doum Mido");
  assert.equal(salutation("Doum mido", "Mme"), "Mme Doum Mido");
  assert.equal(salutation(""), "");
});
