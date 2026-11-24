import { test } from "node:test";
import assert from "node:assert/strict";
import { adModelCode, chantierCode, chantierFirstMessage, chantierProfile, chantierSummary, chantierWhatsappText, findChantierCode, parseChantier, type ChantierAnswers } from "../src/lib/chantier-rules.ts";

const base: ChantierAnswers = { type: "duplex", chambres: "4", terrain: "oui", relief: "plat", plans: "non", start: "asap", budget: "40-60" };

test("réponses valides avec nom et ville", () => {
  const r = parseChantier({ ...base, name: "  Mbarga   Paul ", city: " Yaoundé " });
  assert.deepEqual(r, { answers: base, name: "Mbarga Paul", city: "Yaoundé" });
});

test("réponse inconnue, nom ou ville manquants : refusé", () => {
  assert.equal(parseChantier({ ...base, terrain: "peut-etre", name: "Paul", city: "Douala" }), null);
  assert.equal(parseChantier({ ...base, name: "", city: "Douala" }), null);
  assert.equal(parseChantier({ ...base, name: "Paul", city: "" }), null);
  assert.equal(parseChantier({ ...base, chambres: "2", name: "Paul", city: "Douala" }), null);
});

test("questions conditionnelles : pas de chambres pour un immeuble, pas de relief sans terrain", () => {
  const r = parseChantier({ ...base, type: "immeuble", chambres: undefined, name: "Paul", city: "Douala" });
  assert.equal(r?.answers.chambres, "na");
  const s = parseChantier({ ...base, terrain: "non", relief: undefined, name: "Paul", city: "Douala" });
  assert.equal(s?.answers.relief, "na");
  assert.equal(parseChantier({ ...base, relief: undefined, name: "Paul", city: "Douala" }), null);
});

test("chaud : terrain + démarrage sous 6 mois, nouveaux prix et avance", () => {
  const p = chantierProfile(base);
  assert.equal(p.profile, "pret");
  assert.equal(p.stage, "qualification");
  assert.match(p.offer, /dossier technique/);
  assert.match(p.offer, /duplex : 300 000 FCFA/);
  assert.match(p.offer, /39 000 FCFA, déduite/);
  assert.match(chantierProfile({ ...base, type: "villa", start: "6mois" }).offer, /villa : 200 000 FCFA/);
  assert.match(chantierProfile({ ...base, type: "immeuble", chambres: "na" }).offer, /négocier directement avec Tao/);
  assert.match(chantierProfile({ ...base, relief: "pente" }).offer, /visite de terrain/);
});

test("tiède, froid, hors cible", () => {
  assert.equal(chantierProfile({ ...base, start: "1-3ans" }).profile, "bientot");
  assert.equal(chantierProfile({ ...base, terrain: "cherche", relief: "na" }).profile, "projet");
  assert.equal(chantierProfile({ ...base, plans: "complets" }).profile, "a_ses_plans");
});

test("code lisible : niveau, type + chambres, délai, numéro", () => {
  const code = chantierCode("abc123", base);
  assert.match(code, /^C-D4-AP-\d{4}$/);
  assert.equal(chantierCode("abc123", base), code);
  assert.match(chantierCode("x", { ...base, type: "villa", chambres: "5+", start: "6mois" }), /^C-V5-6M-\d{4}$/);
  assert.match(chantierCode("x", { ...base, type: "immeuble", chambres: "na" }), /^C-I-AP-\d{4}$/);
  assert.match(chantierCode("x", { ...base, start: "1-3ans" }), /^T-D4-LT-\d{4}$/);
  assert.match(chantierCode("x", { ...base, terrain: "non", relief: "na", type: "indecis", chambres: "3" }), /^F-X3-AP-\d{4}$/);
  assert.match(chantierCode("x", { ...base, plans: "complets" }), /^H-D4-AP-\d{4}$/);
});

test("code retrouvé dans le message, nouveau et ancien format", () => {
  const code = chantierCode("abc123", base);
  assert.equal(findChantierCode(chantierWhatsappText(code, "Paul")), code);
  assert.equal(findChantierCode("dossier c-v3-6m-0042 merci"), "C-V3-6M-0042");
  assert.equal(findChantierCode("dossier C-I-AP-1234"), "C-I-AP-1234");
  assert.equal(findChantierCode("dossier ch 004512 merci"), "CH-004512");
  assert.equal(findChantierCode("commande WP-123456"), null);
});

test("résumé sans questions non posées, avec ville ; premier message du chaud", () => {
  const s = chantierSummary({ ...base, type: "immeuble", chambres: "na" }, "Douala");
  assert.doesNotMatch(s, /chambres/);
  assert.match(s, /Ville du chantier : Douala/);
  assert.match(chantierFirstMessage("Paul Mbarga", base, "D4-034"), /modèle D4-034.*dossier technique.*côté où passe la route/);
});

test("adModelCode lit la référence du modèle dans utm_content", () => {
  assert.equal(adModelCode("D5-012"), "D5-012");
  assert.equal(adModelCode("v3-017"), "V3-017");
  assert.equal(adModelCode("guide"), null);
  assert.equal(adModelCode(null), null);
});
