import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySource, parseAttribution } from "../src/lib/attribution.ts";

test("UTM Facebook payante → social_ads", () => {
  const a = parseAttribution("https://www.wooplans.com/catalogue-premium?utm_source=facebook&utm_medium=paid&utm_campaign=cp-oct", null);
  assert.equal(a.source, "social_ads");
  assert.equal(a.utmCampaign, "cp-oct");
  assert.equal(a.landingPath, "/catalogue-premium");
});

test("fbclid sans UTM → social_ads ; Google en référent → search ; rien → direct", () => {
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: true, referrer: null }), "social_ads");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: "https://www.google.com/" }), "search");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: null }), "direct");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: "https://www.wooplans.com/plans" }), "direct");
});

test("TikTok organique → social", () => {
  assert.equal(classifySource({ utmSource: "tiktok", utmMedium: "video", fbclid: false, referrer: null }), "social");
});
