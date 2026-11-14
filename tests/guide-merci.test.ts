import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../public/lp/guide-merci.html", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/guide-merci/route.ts", import.meta.url), "utf8");
const robots = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");

test("page de remerciement du guide : pixel, achat à 1 900 XAF, noindex", () => {
  assert.match(page, /fbq\('init','1127775973645411'\)/);
  assert.match(page, /fbq\('track','Purchase',\{value:1900,currency:'XAF'/);
  assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
});

test("page de remerciement du guide : upsell au prix actuel du catalogue, lien UTM, téléchargement", () => {
  assert.match(page, /Prix actuel : 39 000 FCFA/);
  assert.match(page, /catalogue-premium\?utm_source=guide_pdf&amp;utm_medium=guide&amp;utm_campaign=guide_budget&amp;utm_content=merci/);
  assert.doesNotMatch(page, /cpbook/);
  assert.match(page, /href="\/lp\/guide-maison-budget-[0-9a-f]{12}\.pdf"/);
});

test("route /guide-merci : sert l'asset statique sans index ; robots l'exclut", () => {
  assert.match(route, /\/lp\/guide-merci/);
  assert.match(route, /X-Robots-Tag": "noindex, nofollow"/);
  assert.match(robots, /"\/guide-merci"/);
});
