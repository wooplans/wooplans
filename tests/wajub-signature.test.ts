import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyWajubSignature } from "../src/lib/wajub-signature.ts";

const secret = "whsec_test_secret";
const raw = '{"id":"evt_1","event":"payment.succeeded","data":{"id":"trx_1","customer":{"name":"Ama\\u00eblle"}}}';
const body = new TextEncoder().encode(raw);
const now = 1_790_000_000;
const ts = String(now);
const sign = (data: string, t = ts, key = secret) => `v1=${createHmac("sha256", key).update(`${t}.${data}`).digest("hex")}`;

test("accepte une signature valide sur « horodatage.corps brut »", async () => {
  assert.equal(await verifyWajubSignature(body, sign(raw), ts, secret, now), true);
  assert.equal(await verifyWajubSignature(body, sign(raw), ts, secret, now + 299), true);
});

test("refuse un corps re-sérialisé, un mauvais secret ou un autre horodatage signé", async () => {
  assert.equal(await verifyWajubSignature(body, sign(JSON.stringify(JSON.parse(raw))), ts, secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw, ts, "whsec_other"), ts, secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw, String(now - 5)), ts, secret, now), false);
});

test("refuse une notification rejouée hors de la fenêtre de 5 minutes", async () => {
  assert.equal(await verifyWajubSignature(body, sign(raw), ts, secret, now + 301), false);
  assert.equal(await verifyWajubSignature(body, sign(raw), ts, secret, now - 301), false);
});

test("refuse les en-têtes absents ou mal formés", async () => {
  assert.equal(await verifyWajubSignature(body, null, ts, secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw), null, secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw).replace("v1=", "v0="), ts, secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw), "abc", secret, now), false);
  assert.equal(await verifyWajubSignature(body, sign(raw), ts, "", now), false);
});
