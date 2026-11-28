import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import catalogue from "../src/config/catalogue.json" with { type: "json" };

const CATALOGUE_PRICE = catalogue.price;
import { budgetLabel, galleryHtml, perModelLabel, previewHtml } from "../src/lib/sales-page.ts";

test("galerie : cartes échappées avec budget, modèles sans rendu ignorés", () => {
  const html = galleryHtml([
    { name: "Villa <V3>", category: "villa", coverImage: "/media/upload-1.webp", levels: 1, surfaceTotal: 164, bedrooms: 3, budgetMin: 29_500_000, budgetMax: 36_100_000 },
    { name: "Duplex D4-040", category: "duplex", coverImage: "upload 2.webp", levels: 2, surfaceTotal: 0, bedrooms: 4 },
    { name: "Sans image", category: "villa", coverImage: "", levels: 1, surfaceTotal: 90, bedrooms: 2 },
  ]);
  assert.equal(html.match(/<article/g)?.length, 2);
  assert.match(html, /src="\/media\/upload-1\.webp\?w=480"/);
  assert.match(html, /data-img="\/media\/upload-1\.webp\?w=960"/);
  assert.match(html, /Villa &lt;V3&gt;/);
  assert.match(html, /Plain-pied · 164 m² · 3 chambres/);
  assert.match(html, /Budget indicatif : 30 – 36 M FCFA/);
  assert.match(html, /src="\/media\/upload%202\.webp\?w=480"/);
  assert.match(html, /Duplex R\+1 · 4 chambres<\/p><\/div>/);
  assert.doesNotMatch(html, /data-more/);
});

test("galerie : dernière carte avec les modèles restants", () => {
  const html = galleryHtml([{ name: "Villa V3-017", category: "villa", coverImage: "/media/a.webp", levels: 1, surfaceTotal: 120, bedrooms: 3 }], 98);
  assert.match(html, /data-more/);
  assert.match(html, /\+97<\/b>/);
});

test("budget : fourchette arrondie en millions", () => {
  assert.equal(budgetLabel(13_200_000, 16_200_000), "13 – 16 M FCFA");
  assert.equal(budgetLabel(null, 8_500_000), "≈ 8,5 M FCFA");
  assert.equal(budgetLabel(null, null), null);
});

test("aperçu : échantillon complet (plans cotés, devis avec montants, fiche PDF pour tous les modèles)", () => {
  const html = previewHtml({
    name: "Duplex D4-006", category: "duplex", coverImage: "/media/c.webp", levels: 2, surfaceTotal: 195, bedrooms: 4, bathrooms: 3,
    budgetMin: 37_900_000, budgetMax: 46_300_000, roomsCount: 0, floorPlanUrls: ["/api/apercu/plan/1", "/api/apercu/plan/2"],
    lots: [{ label: "Fondation", amount: 3_601_300 }, { label: "Dalle", amount: 5_117_600 }], modelsCount: 98,
  }).replace(/\u00a0/g, " ");
  assert.match(html, /src="\/api\/apercu\/plan\/1"/);
  assert.match(html, /Rez-de-chaussée/);
  assert.match(html, /Étage/);
  assert.match(html, /Fondation<\/span><b>3 601 300 FCFA/);
  assert.match(html, /Total estimatif<\/span><b>8 718 900 FCFA/);
  assert.match(html, /Fiche-WOOPLANS-D4-006\.pdf/);
  assert.match(html, /pour chacun des 98 modèles/);
  assert.doesNotMatch(html, /après achat|maçon/);
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
  // Échantillon retiré (16 nov. 2026) : la vidéo du catalogue le remplace en haut de page.
  assert.doesNotMatch(b, /data-wp-preview/);
  assert.match(b, /openVsl\(\)/);
  assert.doesNotMatch(b, /50\+|Télécharger le Catalogue|b-cdn\.net/);
  // Paiement B : formulaire court sur la page puis page de paiement (/api/checkout), sans widget Chariow.
  assert.match(b, /id="ckForm"/);
  assert.match(b, /fetch\('\/api\/checkout'/);
  assert.doesNotMatch(b, /chariow-widget|widget\.min\.js/);
  assert.match(b, /name="discountCode"/);
});

test("page de vente : plans complets à prix fixe dans la FAQ seulement, sans déduction", () => {
  const b = readFileSync(PAGE, "utf8").replace(/&nbsp;/g, " ");
  const offers = readFileSync(new URL("../src/lib/custom-plans.ts", import.meta.url), "utf8");
  const prices = [...offers.matchAll(/price: (\d+)/g)].map((m) => Number(m[1]));
  assert.equal(prices.length, 2);
  const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
  for (const price of prices) {
    assert.match(b, new RegExp(fcfa(price)));
  }
  assert.doesNotMatch(b, /déduit|revient à 0|revient donc à 0/i);
  assert.match(b, /id="parcours"/);
  // Plans complets : annoncés dans le parcours (accompagnement WhatsApp, décision de Tao du 16 nov. 2026) et la FAQ,
  // jamais dans la carte de l'offre.
  const faq = b.indexOf('<div class="faq">');
  const offer = b.slice(b.indexOf('class="offer-card"'), b.indexOf("</section>", b.indexOf('class="offer-card"')));
  assert.doesNotMatch(offer, /plans? complets?/i);
  assert.match(b.slice(b.indexOf('id="parcours"'), b.indexOf("</section>", b.indexOf('id="parcours"'))), /WhatsApp/);
  assert.match(b, /Peut-on construire avec les plans du catalogue/);
  assert.doesNotMatch(b, /montrer à votre maçon|sur devis ; le prix du catalogue/);
  assert.match(b, /id="contenu-plans"/);
  // Offre du jour (décision de Tao, 28 nov. 2026) : prix barré, compte à rebours jusqu'à minuit et jauge 20 % → 5 %.
  assert.doesNotMatch(b, /data-wp-threshold|data-wp-left|Prix avant 100/);
  assert.match(b, /<s>50(&nbsp;| )000/);
  assert.match(b, /data-cd/);
  assert.match(b, /data-gfill/);
  assert.match(b, /5\+15\*s\/86400/);
  const [thousands, units] = [Math.floor(CATALOGUE_PRICE / 1000), String(CATALOGUE_PRICE % 1000).padStart(3, "0")];
  assert.equal(CATALOGUE_PRICE, catalogue.price);
  assert.match(b, new RegExp(`class="promo"[^>]*>[^\\n]*${thousands}(&nbsp;| )${units}`)); // bandeau
});

test("page de vente : témoignages juste après le héro, puis le parcours", () => {
  const b = readFileSync(PAGE, "utf8");
  const hero = b.indexOf("</header>"), temo = b.indexOf('id="temoignages"'), road = b.indexOf('id="parcours"');
  assert.ok(hero > 0 && temo > hero && road > temo);
  assert.doesNotMatch(b.slice(hero, temo).replace(/<section $/, ""), /<section/);
});

test("page de vente : VSL courte publique (39 000 FCFA, 2 min) en héro, visuel 4:5, compteur juste dessous", () => {
  const b = readFileSync(PAGE, "utf8");
  assert.match(b, /\.vsl\{[^}]*aspect-ratio:4\/5/);
  assert.match(b, /\/assets\/videos\/vsl-courte-hero-4x5\.webp/);
  // Version publique uniquement : la VSL des acheteurs de l'extrait annonce leur prix réservé (29 000 FCFA).
  assert.match(b, /\/assets\/videos\/vsl-courte\.mp4/);
  assert.doesNotMatch(b, /vsl-catalogue-premium\.mp4/);
  assert.match(b, /<\/div>\s*<p class="vsl-count">.*data-wp-count/);
});

test("pages de vente : prix du catalogue repris de src/config/catalogue.json, sans repère restant", () => {
  const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")}`;
  const html = readFileSync(PAGE, "utf8").replace(/&nbsp;/g, " ");
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
  assert.match(html, new RegExp(`${fcfa(CATALOGUE_PRICE)}( |<)`));
  assert.match(html, new RegExp(`value:${CATALOGUE_PRICE},`));
});

test("prix par modèle : arrondi à la dizaine", () => {
  assert.equal(perModelLabel(63, 39000), "environ 620");
  assert.equal(perModelLabel(63, 29000), "environ 460");
  assert.equal(perModelLabel(100, 39000), "environ 390");
});
