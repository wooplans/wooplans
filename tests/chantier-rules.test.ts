import { test } from "node:test";
import assert from "node:assert/strict";
import { adModelCode, chantierCode, chantierProfile, chantierWhatsappText, findChantierCode, parseChantier, type ChantierAnswers } from "../src/lib/chantier-rules.ts";

const base: ChantierAnswers = { terrain: "oui", start: "asap", plans: "non", type: "duplex", chambres: "4", budget: "40-60" };

test("réponses valides avec nom", () => {
  const r = parseChantier({ ...base, name: "  Kouassi   Jean " });
  assert.deepEqual(r, { answers: base, name: "Kouassi Jean" });
});

test("réponse inconnue ou nom manquant : refusé", () => {
  assert.equal(parseChantier({ ...base, terrain: "peut-etre", name: "Jean" }), null);
  assert.equal(parseChantier({ ...base, name: "" }), null);
  assert.equal(parseChantier({ ...base, chambres: "2", name: "Jean" }), null);
});

test("terrain + démarrage sous 6 mois : prêt, plan complet du bon type", () => {
  const p = chantierProfile(base);
  assert.equal(p.profile, "pret");
  assert.equal(p.stage, "qualification");
  assert.match(p.offer, /duplex \(199 000 FCFA\)/);
  assert.equal(chantierProfile({ ...base, start: "6mois", type: "villa" }).profile, "pret");
  assert.match(chantierProfile({ ...base, type: "villa" }).offer, /villa \(99 000 FCFA\)/);
});

test("terrain mais chantier dans 1 à 3 ans : bientôt", () => {
  assert.equal(chantierProfile({ ...base, start: "1-3ans" }).profile, "bientot");
});

test("pas de terrain : projet, Catalogue Premium", () => {
  const p = chantierProfile({ ...base, terrain: "cherche" });
  assert.equal(p.profile, "projet");
  assert.equal(p.stage, "demande");
  assert.match(p.offer, /Catalogue Premium/);
});

test("a déjà ses plans complets : pas notre cible", () => {
  assert.equal(chantierProfile({ ...base, plans: "complets" }).profile, "a_ses_plans");
});

test("code stable, retrouvé dans le message pré-rempli", () => {
  const code = chantierCode("abc123");
  assert.match(code, /^CH-\d{6}$/);
  assert.equal(chantierCode("abc123"), code);
  assert.equal(findChantierCode(chantierWhatsappText(code, "Jean")), code);
  assert.equal(findChantierCode("dossier ch 004512 merci"), "CH-004512");
  assert.equal(findChantierCode("commande WP-123456"), null);
});

test("adModelCode lit la référence du modèle dans utm_content", () => {
  assert.equal(adModelCode("D5-012"), "D5-012");
  assert.equal(adModelCode("v3-017"), "V3-017");
  assert.equal(adModelCode("guide"), null);
  assert.equal(adModelCode(null), null);
});
