import { test } from "node:test";
import assert from "node:assert/strict";
import { chantierMessages } from "../src/lib/chantier-rules.ts";

const ctx = { name: "PAUL Mbarga", code: "C-D4-AP-4821", type: "duplex", model: "D4-034", city: "Yaoundé", start: "asap" };

test("accueil personnalisé : prénom, dossier, modèle cliqué, dossier technique", () => {
  const m = chantierMessages(ctx).find((x) => x.id === "accueil")!;
  assert.match(m.text, /^Bonjour Paul 👋/);
  assert.match(m.text, /dossier C-D4-AP-4821/);
  assert.match(m.text, /modèle D4-034/);
  assert.match(m.text, /dossier technique/);
  assert.match(m.text, /côté où passe la route/);
});

test("proforma : bon prix, avance, Orange Money, catalogue", () => {
  const t = chantierMessages(ctx).find((x) => x.id === "proforma")!.text;
  assert.match(t, /300 000 FCFA/);
  assert.match(t, /39 000 FCFA, déduite du prix/);
  assert.match(t, /656 71 35 03/);
  assert.match(t, /wooplans\.com\/catalogue/);
  assert.match(chantierMessages({ ...ctx, type: "villa" }).find((x) => x.id === "proforma")!.text, /200 000 FCFA/);
  assert.match(chantierMessages({ ...ctx, type: "immeuble" }).find((x) => x.id === "proforma")!.text, /\[prix convenu\]/);
});

test("jamais de fausse urgence, identifiants uniques", () => {
  const all = chantierMessages(ctx);
  assert.equal(new Set(all.map((m) => m.id)).size, all.length);
  for (const m of all) assert.doesNotMatch(m.text, /expire|dernières? heures?|plus que \d|offre limitée/i);
});

test("sans code ni modèle : pas de trous dans le texte", () => {
  for (const m of chantierMessages({ name: "Jean" })) assert.doesNotMatch(m.text, /undefined|null|\(dossier \)/);
});
