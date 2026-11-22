import assert from "node:assert/strict";
import { test } from "node:test";
import { conversationText, parseQualification } from "../src/lib/conversation-ai-rules.ts";

test("conversation envoyée à l'IA : ordre, auteur, notes vocales", () => {
  const t = conversationText([
    { direction: "out", type: "video", body: "Bonjour M. Kouassi", transcript: null, sentAt: new Date("2026-11-22T10:00:00Z") },
    { direction: "in", type: "audio", body: null, transcript: "J'ai un terrain à Bingerville", sentAt: new Date("2026-11-22T10:05:00Z") },
    { direction: "in", type: "text", body: "Combien ?", transcript: null, sentAt: new Date("2026-11-22T10:06:00Z") },
  ]);
  assert.equal(
    t,
    "2026-11-22 10:00 WooPlans : [video] Bonjour M. Kouassi\n2026-11-22 10:05 Client : [note vocale] J'ai un terrain à Bingerville\n2026-11-22 10:06 Client : Combien ?",
  );
});

test("réponse de l'IA", () => {
  assert.deepEqual(parseQualification('```json\n{"stage":"Chaud","score":82,"summary":"Veut payer","next_action":"Envoyer le lien"}\n```'), {
    stage: "chaud",
    score: 82,
    summary: "Veut payer",
    nextAction: "Envoyer le lien",
  });
  assert.equal(parseQualification('{"stage":"tiède","score":150}')?.score, 100);
  assert.equal(parseQualification('{"stage":"tiède","score":40}')?.stage, "tiede");
  assert.equal(parseQualification("pas de json"), null);
  assert.equal(parseQualification('{"stage":"inconnu","score":10}'), null);
});
