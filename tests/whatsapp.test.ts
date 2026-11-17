import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { classify, firstName, isStopRequest, verifyGenukaSignature, waNumber } from "../src/lib/whatsapp-rules.ts";

test("numéro WhatsApp : format international, sinon null", () => {
  assert.equal(waNumber("2250101084729"), "+2250101084729");
  assert.equal(waNumber("+237 6 53 76 99 98"), "+237653769998");
  assert.equal(waNumber("1234"), null);
  assert.equal(waNumber(null), null);
});

test("prénom : premier mot, majuscule initiale", () => {
  assert.equal(firstName("JULES SAHON"), "Jules");
  assert.equal(firstName(""), "à vous");
});

test("STOP : désinscription reconnue, pas un message ordinaire", () => {
  for (const t of ["STOP", "stop", " Arrêt ", "Stopper", "désinscription"]) assert.ok(isStopRequest(t), t);
  for (const t of ["Je ne veux pas stopper mon projet", "Bonjour", "stop le prix ?"]) assert.ok(!isStopRequest(t), t);
});

test("signature du webhook Genuka", async () => {
  const secret = "whsec_test";
  const body = '{"type":"message_status"}';
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  assert.equal(await verifyGenukaSignature(`t=${t},v1=${v1}`, body, secret), true);
  assert.equal(await verifyGenukaSignature(`t=${t},v1=${v1}`, body + " ", secret), false);
  assert.equal(await verifyGenukaSignature(`t=${t - 600},v1=${v1}`, body, secret), false);
  assert.equal(await verifyGenukaSignature(null, body, secret), false);
});

test("classement à la fin de la séquence", () => {
  const none = { waOptOutAt: null, waClickedAt: null, waRepliedAt: null, waReadAt: null };
  const d = new Date();
  assert.equal(classify(none, true), "client");
  assert.equal(classify({ ...none, waOptOutAt: d }, false), "desinscrit");
  assert.equal(classify({ ...none, waClickedAt: d, waReadAt: d }, false), "chaud");
  assert.equal(classify({ ...none, waRepliedAt: d }, false), "chaud");
  assert.equal(classify({ ...none, waReadAt: d }, false), "tiede");
  assert.equal(classify(none, false), "froid");
});
