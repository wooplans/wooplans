import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyChariowSignature } from "../src/lib/chariow-signature.ts";

const secret = "whsec_test_secret";
// Corps tel qu'envoyé par Chariow : barres obliques et accents échappés.
const raw = '{"event":"successful.sale","product":{"url":"https:\\/\\/x.mychariow.shop\\/p"},"customer":{"name":"Ama\\u00eblle"}}';
const body = new TextEncoder().encode(raw);
const sign = (data: string, key = secret) => `sha256=${createHmac("sha256", key).update(data).digest("hex")}`;

test("accepte une signature valide calculée sur le corps brut", async () => {
  assert.equal(await verifyChariowSignature(body, sign(raw), secret), true);
});

test("refuse un corps re-sérialisé (JSON.stringify)", async () => {
  const reserialized = JSON.stringify(JSON.parse(raw));
  assert.notEqual(reserialized, raw);
  assert.equal(await verifyChariowSignature(body, sign(reserialized), secret), false);
});

test("refuse un mauvais secret, un en-tête absent ou un autre schéma", async () => {
  assert.equal(await verifyChariowSignature(body, sign(raw, "whsec_other"), secret), false);
  assert.equal(await verifyChariowSignature(body, null, secret), false);
  assert.equal(await verifyChariowSignature(body, sign(raw).replace("sha256=", "sha1="), secret), false);
  assert.equal(await verifyChariowSignature(body, sign(raw), ""), false);
});
