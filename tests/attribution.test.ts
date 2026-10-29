import assert from "node:assert/strict";
import { test } from "node:test";
import { channelOf, classifySource, parseAttribution, whatsappGroupLink } from "../src/lib/attribution.ts";

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

test("canal lisible : Facebook, YouTube, Instagram, Email, Google, Direct", () => {
  const c = (source: string, utmSource: string | null, fbclid: boolean, referrer: string | null) =>
    channelOf({ source, utmSource, fbclid, referrer });
  assert.deepEqual(c("social", "youtube", false, "https://www.wooplans.com/"), { channel: "YouTube", paid: false });
  assert.deepEqual(c("social_ads", "facebook", true, null), { channel: "Facebook", paid: true });
  assert.equal(c("social", null, true, "http://m.facebook.com/").channel, "Facebook");
  assert.equal(c("social", null, false, "https://lm.facebook.com/").channel, "Facebook");
  assert.equal(c("social", null, true, null).channel, "Facebook");
  assert.equal(c("social", null, true, "https://l.instagram.com/").channel, "Instagram");
  assert.equal(c("social", null, false, "android-app://com.google.android.youtube/").channel, "YouTube");
  assert.equal(c("search", null, false, "android-app://com.google.android.gm/").channel, "Email");
  assert.equal(c("search", null, false, "https://mail.google.com/").channel, "Email");
  assert.equal(c("search", null, false, "android-app://com.google.android.googlequicksearchbox/").channel, "Google et moteurs");
  assert.equal(c("search", null, false, "https://www.bing.com/").channel, "Google et moteurs");
  assert.equal(c("chatgpt.com", "chatgpt.com", false, null).channel, "ChatGPT et IA");
  assert.equal(c("referral", null, false, "https://l.wl.co/").channel, "WhatsApp");
  assert.equal(c("referral", null, false, "https://teams.public.onecdn.static.microsoft/").channel, "Autres sites");
  assert.equal(c("social_ads", null, false, null).channel, "TikTok");
  assert.deepEqual(c("direct", null, false, "https://www.wooplans.com/catalogue"), { channel: "Direct", paid: false });
  assert.deepEqual(c("direct", null, false, null), { channel: "Direct", paid: false });
});

test("lien de partage dans les groupes WhatsApp → canal WhatsApp, campagne = référence du modèle", () => {
  const link = whatsappGroupLink("https://www.wooplans.com/", { slug: "villa-v3-037", code: "v3-037" });
  assert.equal(link, "https://www.wooplans.com/catalogue/villa-v3-037?utm_source=whatsapp&utm_medium=groupe&utm_campaign=V3-037");
  const a = parseAttribution(link, null);
  assert.equal(a.source, "social");
  assert.equal(a.utmCampaign, "V3-037");
  assert.equal(channelOf({ source: a.source, utmSource: a.utmSource, fbclid: false, referrer: null }).channel, "WhatsApp");
});
