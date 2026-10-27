import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import catalogue from "../src/config/catalogue.json" with { type: "json" };

const CATALOGUE_PRICE = catalogue.price;
import { budgetLabel, galleryHtml, perModelLabel, previewHtml, priceStep } from "../src/lib/sales-page.ts";

test("galerie : cartes échappées avec budget, modèles sans rendu ignorés", () => {
  const html = galleryHtml([
    { name: "Villa <V3>", category: "villa", coverImage: "/media/upload-1.webp", levels: 1, surfaceTotal: 164, bedrooms: 3, budgetMin: 29_500_000, budgetMax: 36_100_000 },
    { name: "Duplex D4-040", category: "duplex", coverImage: "upload 2.webp", levels: 2, surfaceTotal: 0, bedrooms: 4 },
    { name: "Sans image", category: "villa", coverImage: "", levels: 1, surfaceTotal: 90, bedrooms: 2 },
  ]);
  assert.equal(html.match(/<article/g)?.length, 2);
  assert.match(html, /Villa &lt;V3&gt;/);
  assert.match(html, /Plain-pied · 164 m² · 3 chambres/);
  assert.match(html, /Budget indicatif : 30 – 36 M FCFA/);
  assert.match(html, /src="\/media\/upload%202\.webp"/);
  assert.match(html, /Duplex R\+1 · 4 chambres<\/p><\/div>/);
});

test("budget : fourchette arrondie en millions", () => {
  assert.equal(budgetLabel(13_200_000, 16_200_000), "13 – 16 M FCFA");
  assert.equal(budgetLabel(null, 8_500_000), "≈ 8,5 M FCFA");
  assert.equal(budgetLabel(null, null), null);
});

test("aperçu : intitulés des postes visibles, jamais les montants", () => {
  const html = previewHtml({
    name: "Villa V3-037", category: "villa", coverImage: "/media/c.webp", levels: 1, surfaceTotal: 164, bedrooms: 3, bathrooms: 2,
    budgetMin: 29_500_000, budgetMax: 36_100_000, roomsCount: 16, floorPlansCount: 2, lotLabels: ["Fondation", "Élévations"],
  });
  assert.match(html, /Fondation/);
  assert.match(html, /16 pièces/);
  assert.match(html, /Fiche-WOOPLANS-V3-037\.pdf/);
  assert.doesNotMatch(html, /4 005 200|4005200|32 816 000/);
  assert.equal(previewHtml(null), "");
});

const PAGE = new URL("../public/lp/catalogue-premium.html", import.meta.url);

test("page de vente générée : une seule page (ancienne B), alignée sur le livrable", () => {
  const b = readFileSync(PAGE, "utf8");
  // Marqueur « b » gardé pour la continuité des statistiques ; l'ancienne page A n'existe plus.
  assert.match(b, /var WP_VARIANT='b'/);
  assert.equal(existsSync(new URL("../public/lp/catalogue-premium-b.html", import.meta.url)), false);
  assert.doesNotMatch(b, /237653769998/);
  assert.match(b, /data-wp-gallery/);
  assert.match(b, /data-wp-count/);
  assert.match(b, /data-wp-preview/);
  assert.match(b, /Fiches PDF de chaque modèle en téléchargement/);
  assert.doesNotMatch(b, /50\+|Télécharger le Catalogue|b-cdn\.net/);
  // Paiement B : formulaire court sur la page puis page de paiement (/api/checkout), sans widget Chariow.
  assert.match(b, /id="ckForm"/);
  assert.match(b, /fetch\('\/api\/checkout'/);
  assert.doesNotMatch(b, /chariow-widget|widget\.min\.js/);
  assert.match(b, /name="discountCode"/);
});

test("page de vente : la feuille de route et la FAQ reprennent les prix fixes des plans complets, catalogue déduit", () => {
  const b = readFileSync(PAGE, "utf8").replace(/&nbsp;/g, " ");
  const offers = readFileSync(new URL("../src/lib/custom-plans.ts", import.meta.url), "utf8");
  const prices = [...offers.matchAll(/price: (\d+)/g)].map((m) => Number(m[1]));
  assert.equal(prices.length, 2);
  const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
  for (const price of prices) {
    assert.match(b, new RegExp(fcfa(price)));
    assert.match(b, new RegExp(fcfa(price - CATALOGUE_PRICE)));
  }
  assert.match(b, /id="parcours"/);
  assert.match(b, /Peut-on construire avec les plans du catalogue/);
  assert.doesNotMatch(b, /montrer à votre maçon|sur devis ; le prix du catalogue/);
  assert.doesNotMatch(b, /data-countdown|du jour/);
  assert.match(b, /id="contenu-plans"/);
  assert.equal(b.match(/data-wp-threshold/g)?.length, 5);
});

test("page de vente : VSL 4:5 avec aperçu muet, compteur sous la vidéo et suivi des visionnages", () => {
  const b = readFileSync(PAGE, "utf8");
  assert.match(b, /\.vsl\{[^}]*aspect-ratio:4\/5/);
  // ?v=<prix> : nouvelle adresse (cache navigateur et CDN) quand le prix, donc la vidéo, change.
  assert.match(b, new RegExp(`data-preview="/videos/vsl-catalogue-premium-apercu\\.mp4\\?v=${CATALOGUE_PRICE}"`));
  assert.match(b, new RegExp(`src="/videos/vsl-catalogue-premium\\.mp4\\?v=${CATALOGUE_PRICE}"`));
  assert.match(b, /\/assets\/digital\/vsl-poster\.webp/);
  assert.doesNotMatch(b, /vsl-cpbook-digital|hero-video-poster/);
  // La voix off renvoie au compteur « juste sous la vidéo ».
  assert.match(b, /<\/div>\s*<p class="vsl-count" data-wp-threshold>.*data-wp-count.*data-wp-left/);
  assert.match(b, /trackVideo\(box\.querySelector\('video'\),'vsl'\)/);
});

test("pages de vente : prix du catalogue repris de src/config/catalogue.json, sans repère restant", () => {
  const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")}`;
  const html = readFileSync(PAGE, "utf8").replace(/&nbsp;/g, " ");
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
  assert.match(html, new RegExp(`${fcfa(CATALOGUE_PRICE)}( |<)`));
  assert.match(html, new RegExp(`value:${CATALOGUE_PRICE},`));
});

test("palier de prix : modèles restants accordés, jauge bornée, palier atteint", () => {
  assert.deepEqual(priceStep(63), { reached: false, leftLabel: "37 modèles", percent: 63 });
  assert.deepEqual(priceStep(99), { reached: false, leftLabel: "1 modèle", percent: 99 });
  assert.deepEqual(priceStep(100), { reached: true, leftLabel: "0 modèle", percent: 100 });
  assert.equal(priceStep(130).percent, 100);
});

test("prix par modèle : arrondi à la dizaine", () => {
  assert.equal(perModelLabel(63, 39000), "environ 620");
  assert.equal(perModelLabel(63, 29000), "environ 460");
  assert.equal(perModelLabel(100, 39000), "environ 390");
});
