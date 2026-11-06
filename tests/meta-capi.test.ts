import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildPurchaseEvent, hashedUserData, sendMetaPurchase } from "../src/lib/meta-capi.ts";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const base = {
  eventId: "wp_purchase_abc",
  value: 29000,
  currency: "XAF",
  contentName: "Catalogue Premium Wooplans",
  occurredAt: new Date("2026-11-05T10:00:00Z"),
  email: "  Acheteur@Example.COM ",
  phone: "+237 655 36 19 71",
  country: "CM",
  sourceUrl: "https://www.wooplans.com/catalogue-premium",
};

test("email, numéro et pays sont normalisés puis hachés, jamais en clair", async () => {
  const u = await hashedUserData(base);
  assert.deepEqual(u.em, [sha("acheteur@example.com")]);
  assert.deepEqual(u.ph, [sha("237655361971")]);
  assert.deepEqual(u.country, [sha("cm")]);
  assert.ok(!JSON.stringify(u).includes("example.com"));
});

test("l'évènement Purchase porte l'eventID du Pixel, la valeur et la devise", async () => {
  const e = await buildPurchaseEvent(base);
  assert.equal(e.event_name, "Purchase");
  assert.equal(e.event_id, "wp_purchase_abc");
  assert.equal(e.event_time, Math.floor(Date.parse("2026-11-05T10:00:00Z") / 1000));
  assert.equal(e.action_source, "website");
  assert.deepEqual(e.custom_data, { value: 29000, currency: "XAF", content_name: "Catalogue Premium Wooplans" });
});

test("rien n'est envoyé sans jeton, sans pixel ou sans valeur", async () => {
  assert.equal(await sendMetaPurchase("123", undefined, base), "skipped");
  assert.equal(await sendMetaPurchase(undefined, "tok", base), "skipped");
  assert.equal(await sendMetaPurchase("123", "tok", { ...base, value: 0 }), "skipped");
});
