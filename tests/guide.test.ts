import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GUIDE_CATALOGUE_PATH, GUIDE_CTA_ID, GUIDE_PDF_ASSET, GUIDE_PRICE, guideDownloadPath, isGuideIntent } from "../src/lib/guide-data.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("guide : repère de l'achat, prix et lien personnel de téléchargement", () => {
  assert.equal(GUIDE_CTA_ID, "guide_budget");
  assert.equal(GUIDE_PRICE, 1900);
  assert.equal(isGuideIntent({ ctaId: GUIDE_CTA_ID }), true);
  assert.equal(isGuideIntent({ ctaId: "plan_devis" }), false);
  assert.equal(isGuideIntent(null), false);
  assert.equal(guideDownloadPath("abc123"), "/api/guide/abc123");
  assert.match(GUIDE_CATALOGUE_PATH, /^\/catalogue-premium\?utm_source=guide_site&utm_medium=merci&utm_campaign=guide_budget/);
});

test("guide : le PDF servi aux acheteurs existe dans les fichiers statiques", () => {
  assert.ok(readFileSync(new URL(`../public${GUIDE_PDF_ASSET}`, import.meta.url)).length > 1_000_000);
});

test("guide : page de vente /guide-budget : formulaire vers /api/guide, prix, sans index, mesure du site", () => {
  const page = read("public/lp/guide-budget.html");
  assert.match(page, /fetch\('\/api\/guide'/);
  assert.match(page, /1&nbsp;900&nbsp;FCFA/);
  assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(page, /1127775973645411/); // pixel du site, chargé par le bloc de mesure (consentement en Europe)
  assert.doesNotMatch(page, /cpbook|mychariow/);
  const route = read("src/app/guide-budget/route.ts");
  assert.match(route, /\/lp\/guide-budget/);
  assert.match(route, /X-Robots-Tag": "noindex, nofollow"/);
  assert.match(read("src/app/robots.ts"), /"\/guide-budget"/);
});

test("guide : l'API d'achat et le webhook sont branchés", () => {
  const api = read("src/app/api/guide/route.ts");
  assert.match(api, /createChariowCheckout/);
  assert.match(api, /redirectUrl: `\$\{request\.nextUrl\.origin\}\/merci\?i=\$\{intentId\}`/);
  assert.match(api, /status: 503/); // produit non configuré : achat indisponible, jamais de paiement à l'aveugle
  const webhook = read("src/lib/chariow.ts");
  assert.match(webhook, /guideProductId\(\) && productId === guideProductId\(\)\) return processGuideSale/);
  const download = read("src/app/api/guide/[id]/route.ts");
  assert.match(download, /intent\.status !== "paid"/);
  assert.match(read("src/app/api/achat/statut/route.ts"), /guide: isGuideIntent\(intent\)/);
});
