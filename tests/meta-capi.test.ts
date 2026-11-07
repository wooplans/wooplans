import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildMetaPayload, buildUserData, fbcFromFbclid, metaEventId, parseBrowserContext } from "../src/lib/meta-capi-data.ts";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

test("données personnelles normalisées puis hachées (SHA-256), contexte navigateur en clair", async () => {
  const data = await buildUserData(
    { email: "  Jean.Dupont@Gmail.com ", phone: "+237 6 94 32 78 85", name: "Éloïse  Mbarga Nkolo", country: "CM", externalId: "VisitorAbc" },
    { ip: "102.1.2.3", ua: "Mozilla/5.0", fbp: "fb.1.1.123", fbc: "fb.1.2.abc" },
  );
  assert.deepEqual(data.em, [sha("jean.dupont@gmail.com")]);
  assert.deepEqual(data.ph, [sha("237694327885")]);
  assert.deepEqual(data.fn, [sha("eloise")]);
  assert.deepEqual(data.ln, [sha("mbargankolo")]);
  assert.deepEqual(data.country, [sha("cm")]);
  assert.deepEqual(data.external_id, [sha("visitorabc")]);
  assert.equal(data.client_ip_address, "102.1.2.3");
  assert.equal(data.client_user_agent, "Mozilla/5.0");
  assert.equal(data.fbp, "fb.1.1.123");
  assert.equal(data.fbc, "fb.1.2.abc");
});

test("champs absents : rien d'envoyé (pas de hachage de chaîne vide)", async () => {
  const data = await buildUserData({ email: "a@b.co", name: "Tao" }, null);
  assert.deepEqual(Object.keys(data).sort(), ["em", "fn"]);
});

test("évènement au format Meta, avec event_id pour la déduplication avec le Pixel", async () => {
  const body = (await buildMetaPayload(
    {
      eventName: "Purchase",
      eventId: "wp_purchase_abc",
      eventTime: new Date("2026-11-07T10:00:00Z"),
      user: { email: "a@b.co" },
      customData: { value: 39000, currency: "XAF" },
    },
    "https://www.wooplans.com/",
    "TEST123",
  )) as { data: Record<string, unknown>[]; test_event_code?: string };
  const [event] = body.data;
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "wp_purchase_abc");
  assert.equal(event.event_time, Date.UTC(2026, 10, 7, 10) / 1000);
  assert.equal(event.action_source, "website");
  assert.equal(event.event_source_url, "https://www.wooplans.com/");
  assert.deepEqual(event.custom_data, { value: 39000, currency: "XAF" });
  assert.equal(body.test_event_code, "TEST123");
});

test("cookie _fbc au format du Pixel, identifiants et contexte", () => {
  assert.equal(fbcFromFbclid("IwAR123abc", 1700000000000), "fb.1.1700000000000.IwAR123abc");
  assert.match(metaEventId("ic"), /^ic_[0-9a-f-]{36}$/);
  assert.deepEqual(parseBrowserContext('{"ip":"1.2.3.4"}'), { ip: "1.2.3.4" });
  assert.equal(parseBrowserContext("pas du json"), null);
  assert.equal(parseBrowserContext(null), null);
});
