import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySource, parseAttribution } from "../src/lib/attribution.ts";

test("UTM Facebook payante → social_ads", () => {
  const a = parseAttribution("https://www.wooplans.com/catalogue-premium?utm_source=facebook&utm_medium=paid&utm_campaign=cp-oct", null);
  assert.equal(a.source, "social_ads");
  assert.equal(a.utmCampaign, "cp-oct");
  assert.equal(a.landingPath, "/catalogue-premium");
});

test("fbclid sans UTM → social (publication gratuite ou pub, indiscernable) ; Google en référent → search ; rien → direct", () => {
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: true, referrer: null }), "social");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: "https://www.google.com/" }), "search");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: null }), "direct");
  assert.equal(classifySource({ utmSource: null, utmMedium: null, fbclid: false, referrer: "https://www.wooplans.com/plans" }), "direct");
});

test("TikTok organique → social", () => {
  assert.equal(classifySource({ utmSource: "tiktok", utmMedium: "video", fbclid: false, referrer: null }), "social");
});

test("identifiants de clic des régies : ttclid → social_ads, gclid → search_ads ; UTM payants prioritaires", () => {
  assert.equal(parseAttribution("https://www.wooplans.com/?ttclid=abc", null).source, "social_ads");
  assert.equal(parseAttribution("https://www.wooplans.com/?gclid=abc", null).source, "search_ads");
  assert.equal(parseAttribution("https://www.wooplans.com/?fbclid=abc", "https://m.facebook.com/").source, "social");
  assert.equal(
    parseAttribution("https://www.wooplans.com/?utm_source=facebook&utm_medium=paid_social&fbclid=abc", null).source,
    "social_ads",
  );
  assert.equal(parseAttribution("https://www.wooplans.com/?utm_source=youtube&utm_medium=social", null).source, "social");
});
