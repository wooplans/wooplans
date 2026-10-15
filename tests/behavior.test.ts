import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildBatch,
  countryRequiresConsent,
  filterEvent,
  isPrivatePath,
  measurementAllowed,
  pageType,
  planSlugFromPath,
  readConsent,
  sanitizeUrl,
  timeZoneRequiresConsent,
  variantFromCta,
} from "../src/lib/behavior.ts";

test("pages privées : jamais mesurées", () => {
  for (const p of ["/admin", "/admin/crm/1", "/espace-premium", "/espace-premium/plans/villa-v4-001", "/connexion", "/merci", "/televersement"]) {
    assert.equal(isPrivatePath(p), true, p);
  }
  for (const p of ["/", "/catalogue", "/catalogue/villa-v4-001", "/catalogue-premium", "/plans-personnalises", "/administration-locale", "/merci-beaucoup"]) {
    assert.equal(isPrivatePath(p), false, p);
  }
});

test("type de page et modèle consulté", () => {
  assert.equal(pageType("/"), "vitrine");
  assert.equal(pageType("/catalogue"), "catalogue");
  assert.equal(pageType("/catalogue-villa"), "catalogue");
  assert.equal(pageType("/catalogue/villa-v4-001"), "fiche_modele");
  assert.equal(pageType("/catalogue-premium"), "page_vente");
  assert.equal(pageType("/plans-personnalises"), "demande_plans");
  assert.equal(pageType("/a-propos"), "contenu");
  assert.equal(planSlugFromPath("/catalogue/duplex-d5-002"), "duplex-d5-002");
  assert.equal(planSlugFromPath("/catalogue"), null);
});

test("URL nettoyées : seuls les paramètres de campagne et de filtre restent", () => {
  assert.equal(
    sanitizeUrl("https://www.wooplans.com/connexion?email=a%40b.com&code=123456&utm_source=facebook#x"),
    "https://www.wooplans.com/connexion?utm_source=facebook",
  );
  assert.equal(sanitizeUrl("https://www.wooplans.com/catalogue?chambres=4&token=abc"), "https://www.wooplans.com/catalogue?chambres=4");
  assert.equal(sanitizeUrl("/merci?intent=xyz"), "/merci");
  assert.equal(sanitizeUrl(null), null);
});

test("filtre avant envoi : rien depuis une page privée, URL et référent nettoyés ailleurs", () => {
  assert.equal(filterEvent({ event: "$pageview", properties: {} }, "/espace-premium"), null);
  assert.equal(filterEvent(null, "/"), null);
  const e = filterEvent(
    { event: "$pageview", properties: { $current_url: "https://www.wooplans.com/?email=x@y.z", $referrer: "https://www.wooplans.com/connexion?email=x@y.z", other: "?email=keep" } },
    "/",
  );
  assert.equal(e?.properties?.$current_url, "https://www.wooplans.com/");
  assert.equal(e?.properties?.$referrer, "https://www.wooplans.com/connexion");
  assert.equal(e?.properties?.other, "?email=keep");
});

test("consentement : Europe sur accord, ailleurs sauf refus", () => {
  assert.equal(countryRequiresConsent("FR"), true);
  assert.equal(countryRequiresConsent("be"), true);
  assert.equal(countryRequiresConsent("CH"), true);
  assert.equal(countryRequiresConsent("CM"), false);
  assert.equal(countryRequiresConsent(null), false);
  assert.equal(timeZoneRequiresConsent("Europe/Paris"), true);
  assert.equal(timeZoneRequiresConsent("Atlantic/Canary"), true);
  assert.equal(timeZoneRequiresConsent("Africa/Douala"), false);
  assert.equal(timeZoneRequiresConsent("Africa/Abidjan"), false);
  assert.equal(readConsent("a=1; wp_consent=granted; b=2"), "granted");
  assert.equal(readConsent("wp_consent=denied"), "denied");
  assert.equal(readConsent("wp_consent=peut-etre"), null);
  assert.equal(readConsent(undefined), null);
  assert.equal(measurementAllowed({ requiresConsent: false, consent: null }), true);
  assert.equal(measurementAllowed({ requiresConsent: false, consent: "denied" }), false);
  assert.equal(measurementAllowed({ requiresConsent: true, consent: null }), false);
  assert.equal(measurementAllowed({ requiresConsent: true, consent: "granted" }), true);
});

test("variante A/B lue dans l'identifiant de CTA", () => {
  assert.equal(variantFromCta("hero@b"), "b");
  assert.equal(variantFromCta("sales_page@a"), "a");
  assert.equal(variantFromCta("home_hero"), null);
  assert.equal(variantFromCta(null), null);
});

test("événements serveur : sans profil de personne ni donnée personnelle", () => {
  const body = buildBatch("phc_test", [{ event: "purchase_success", distinctId: "vid123", properties: { amount: 39000 } }], new Date("2026-10-15T08:00:00Z"));
  assert.equal(body.api_key, "phc_test");
  assert.equal(body.batch.length, 1);
  assert.deepEqual(body.batch[0], {
    event: "purchase_success",
    distinct_id: "vid123",
    timestamp: "2026-10-15T08:00:00.000Z",
    properties: { amount: 39000, $process_person_profile: false, $lib: "wooplans-server" },
  });
  assert.deepEqual(buildBatch("phc_test", []).batch, []);
});

test("pages de vente générées : PostHog à la place de Clarity, paiement exclu, consentement", () => {
  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const key = wrangler.match(/"POSTHOG_KEY"\s*:\s*"([^"]*)"/)?.[1] ?? "";
  for (const file of ["catalogue-premium.html", "catalogue-premium-b.html"]) {
    const html = readFileSync(new URL(`../public/lp/${file}`, import.meta.url), "utf8");
    assert.ok(!/clarity/i.test(html), `${file} : Clarity`);
    assert.ok(html.includes(`var PH_KEY='${key}'`), `${file} : clé PostHog différente de wrangler.jsonc (relancer scripts/build-sales-page.py)`);
    assert.ok(html.includes('id="chariow-widget" class="ph-no-capture"'), `${file} : widget de paiement`);
    assert.ok(html.includes("maskAllInputs:true"), `${file} : masquage des saisies`);
    assert.ok(html.includes("window.wpConsent"), `${file} : consentement`);
  }
});
