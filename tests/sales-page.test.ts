import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { chooseVariant, galleryHtml } from "../src/lib/sales-page.ts";

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

test("galerie : cartes échappées, modèles sans rendu ignorés", () => {
  const html = galleryHtml([
    { name: "Villa <V3>", category: "villa", coverImage: "/media/upload-1.webp", levels: 1, surfaceTotal: 164, bedrooms: 3 },
    { name: "Duplex D4-040", category: "duplex", coverImage: "upload 2.webp", levels: 2, surfaceTotal: 0, bedrooms: 4 },
    { name: "Sans image", category: "villa", coverImage: "", levels: 1, surfaceTotal: 90, bedrooms: 2 },
  ]);
  assert.equal(html.match(/<article/g)?.length, 2);
  assert.match(html, /Villa &lt;V3&gt;/);
  assert.match(html, /Plain-pied · 164 m² · 3 chambres/);
  assert.match(html, /src="\/media\/upload%202\.webp"/);
  assert.match(html, /Deux niveaux · 4 chambres/);
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
  assert.match(b, /Fiche PDF/);
  assert.doesNotMatch(b, /50\+|Télécharger le Catalogue|b-cdn\.net/);
  assert.match(b, /data-locale="fr"/);
  assert.match(b, /widget_ready/);
});
