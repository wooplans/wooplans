import { test } from "node:test";
import assert from "node:assert/strict";
import { applyProtocol, chantierAiUserPrompt, leadStageFor, parseChantierAi } from "../src/lib/chantier-ai-rules.ts";

const now = new Date("2026-11-25T10:00:00Z");
const ids = ["accueil", "proforma", "pas-de-dossier"];

test("réponse valide : étape, terrain, relance, message", () => {
  const r = parseChantierAi(
    '{"step":"attente","land":"Dimensions","land_details":"20 × 15 m","relief":"plat","summary":"En voyage.","next_action":"Relancer vendredi.","message_id":"pas-de-dossier","follow_up":"2026-11-28","lost_reason":"x"}',
    ids,
    now,
  );
  assert.deepEqual(r, { step: "attente", land: "dimensions", landDetails: "20 × 15 m", relief: "plat", summary: "En voyage.", nextAction: "Relancer vendredi.", messageId: "pas-de-dossier", followUp: "2026-11-28", lostReason: "" });
});

test("bornes et valeurs inconnues", () => {
  const r = parseChantierAi('texte {"step":"proforma","land":"?","message_id":"inexistant","follow_up":"2020-01-01"} fin', ids, now)!;
  assert.equal(r.land, "aucun");
  assert.equal(r.messageId, null);
  assert.equal(r.followUp, "2026-11-25");
  assert.equal(parseChantierAi('{"step":"proforma","follow_up":"2030-01-01"}', ids, now)!.followUp, "2027-03-25");
  assert.equal(parseChantierAi('{"step":"perdu","follow_up":"2026-11-30","lost_reason":"pas de terrain"}', ids, now)!.followUp, null);
  assert.equal(parseChantierAi('{"step":"inconnu"}', ids, now), null);
  assert.equal(parseChantierAi("pas de json", ids, now), null);
});

test("étape CRM : jamais de recul après commande, attente garde l'étape", () => {
  assert.equal(leadStageFor("proforma", "qualification"), "devis");
  assert.equal(leadStageFor("engage", "devis"), "commande");
  assert.equal(leadStageFor("perdu", "production"), "production");
  assert.equal(leadStageFor("attente", "devis"), "devis");
  assert.equal(leadStageFor("attente", "demande"), "qualification");
  assert.equal(leadStageFor("accueil", "perdu"), "qualification");
});

test("prompt : date du jour avec le jour de la semaine, conversation lisible", () => {
  const p = chantierAiUserPrompt("C-D4-AP-4821", [{ direction: "in", type: "audio", body: null, transcript: "Je suis au village", sentAt: now }], [{ id: "accueil", title: "Premier message" }], now);
  assert.match(p, /2026-11-25 \(mercredi\)/);
  assert.match(p, /Client : \[note vocale\] Je suis au village/);
  assert.match(p, /accueil \(Premier message\)/);
});

test("tièdes et froids : en attente 60 jours, un seul message, sauf si la conversation a changé la donne", () => {
  const base = parseChantierAi('{"step":"accueil","message_id":"accueil","follow_up":"2026-11-26"}', ["accueil", "tiede", "froid"], now)!;
  const t = applyProtocol(base, "bientot", now);
  assert.equal(t.step, "attente");
  assert.equal(t.messageId, "tiede");
  assert.equal(t.followUp, "2027-01-24");
  assert.equal(t.nurture, true);
  assert.equal(applyProtocol(base, "projet", now).messageId, "froid");
  assert.equal(applyProtocol(base, "pret", now).step, "accueil");
  assert.equal(applyProtocol({ ...base, step: "terrain" }, "bientot", now).step, "terrain");
});
