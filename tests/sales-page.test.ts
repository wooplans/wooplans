import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { budgetLabel, chooseVariant, galleryHtml, perModelLabel, previewHtml, priceStep } from "../src/lib/sales-page.ts";

test("variante : part 0 → A pour tous, sans cookie", () => {
  assert.deepEqual(chooseVariant({ query: null, cookie: undefined, share: 0, random: 0 }), { variant: "a", remember: false });
  assert.deepEqual(chooseVariant({ query: null, cookie: "b", share: 0, random: 0 }), { variant: "a", remember: false });
});

test("variante : ?variante=b force l'aperçu et le mémorise", () => {
  assert.deepEqual(chooseVariant({ query: "B", cookie: undefined, share: 0, random: 0.9 }), { variant: "b", remember: true });
  assert.deepEqual(chooseVariant({ query: "a", cookie: "b", share: 50, random: 0 }), { variant: "a", remember: true });
});

test("variante : tirage selon la part, puis visiteur fidèle à sa variante", () => {
  assert.equal(chooseVariant({ query: null, cookie: undefined, share: 50, random: 0.2 }).variant, "b");
  assert.equal(chooseVariant({ query: null, cookie: undefined, share: 50, random: 0.7 }).variant, "a");
  assert.deepEqual(chooseVariant({ query: null, cookie: "a", share: 50, random: 0 }), { variant: "a", remember: false });
  assert.equal(chooseVariant({ query: null, cookie: "a", share: 100, random: 0.99 }).variant, "b");
  assert.equal(chooseVariant({ query: "x", cookie: undefined, share: Number("abc"), random: 0 }).variant, "a");
});

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

test("pages générées : A inchangée côté offre, B alignée sur le livrable", () => {
  const a = readFileSync(new URL("../public/lp/catalogue-premium.html", import.meta.url), "utf8");
  const b = readFileSync(new URL("../public/lp/catalogue-premium-b.html", import.meta.url), "utf8");
  assert.match(a, /var WP_VARIANT='a'/);
  assert.match(b, /var WP_VARIANT='b'/);
  for (const page of [a, b]) {
    assert.match(page, /data-product-id="prd_41k85hc0"/);
    assert.doesNotMatch(page, /237653769998/);
  }
  assert.match(b, /data-wp-gallery/);
  assert.match(b, /data-wp-count/);
  assert.match(b, /data-wp-preview/);
  assert.match(b, /Fiches PDF de chaque modèle en téléchargement/);
  assert.doesNotMatch(b, /50\+|Télécharger le Catalogue|b-cdn\.net/);
  assert.match(b, /data-locale="fr"/);
  assert.match(b, /widget_ready/);
});

test("page B : la feuille de route et la FAQ reprennent les prix fixes des plans complets, catalogue déduit", () => {
  const b = readFileSync(new URL("../public/lp/catalogue-premium-b.html", import.meta.url), "utf8").replace(/&nbsp;/g, " ");
  const offers = readFileSync(new URL("../src/lib/custom-plans.ts", import.meta.url), "utf8");
  const prices = [...offers.matchAll(/price: (\d+)/g)].map((m) => Number(m[1]));
  assert.equal(prices.length, 2);
  const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
  for (const price of prices) {
    assert.match(b, new RegExp(fcfa(price)));
    assert.match(b, new RegExp(fcfa(price - 39000)));
  }
  assert.match(b, /id="parcours"/);
  assert.match(b, /Peut-on construire avec les plans du catalogue/);
  assert.doesNotMatch(b, /montrer à votre maçon|sur devis ; le prix du catalogue/);
  assert.doesNotMatch(b, /data-countdown|du jour/);
  assert.match(b, /id="contenu-plans"/);
  assert.equal(b.match(/data-wp-threshold/g)?.length, 5);
});

test("page B : VSL 4:5 avec aperçu muet, compteur sous la vidéo et suivi des visionnages", () => {
  const b = readFileSync(new URL("../public/lp/catalogue-premium-b.html", import.meta.url), "utf8");
  assert.match(b, /\.vsl\{[^}]*aspect-ratio:4\/5/);
  assert.match(b, /data-preview="\/videos\/vsl-catalogue-premium-apercu\.mp4"/);
  assert.match(b, /src="\/videos\/vsl-catalogue-premium\.mp4"/);
  assert.match(b, /\/assets\/digital\/vsl-poster\.webp/);
  assert.doesNotMatch(b, /vsl-cpbook-digital|hero-video-poster/);
  // La voix off renvoie au compteur « juste sous la vidéo ».
  assert.match(b, /<\/div>\s*<p class="vsl-count" data-wp-threshold>.*data-wp-count.*data-wp-left/);
  assert.match(b, /trackVideo\(box\.querySelector\('video'\),'vsl'\)/);
});

test("palier de prix : modèles restants accordés, jauge bornée, palier atteint", () => {
  assert.deepEqual(priceStep(63), { reached: false, leftLabel: "37 modèles", percent: 63 });
  assert.deepEqual(priceStep(99), { reached: false, leftLabel: "1 modèle", percent: 99 });
  assert.deepEqual(priceStep(100), { reached: true, leftLabel: "0 modèle", percent: 100 });
  assert.equal(priceStep(130).percent, 100);
});

test("prix par modèle : arrondi à la dizaine", () => {
  assert.equal(perModelLabel(63), "environ 620");
  assert.equal(perModelLabel(100), "environ 390");
});
