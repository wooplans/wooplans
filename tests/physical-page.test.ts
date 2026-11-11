import assert from "node:assert/strict";
import { test } from "node:test";
import physical from "../src/config/catalogue-physique.json" with { type: "json" };
import { cameroonPhone, moreModelsHtml, orderMessage, orderRef, parseOrder, shortOrderMessage, topModelsHtml, whatsappUrl } from "../src/lib/physical-page.ts";

const plan = {
  code: "D4-006", name: "Duplex <D4-006>", category: "duplex", coverImage: "renders/a.webp", renders: ["renders/a.webp", "renders/b.webp"],
  levels: 2, surfaceTotal: 195, bedrooms: 4, bathrooms: 3, landArea: 300, budgetMin: 37_900_000, budgetMax: 46_300_000,
};

test("config : 49 000 FCFA, 100 plans, numéro des commandes", () => {
  assert.equal(physical.price, 49000);
  assert.equal(physical.models, 100);
  assert.equal(physical.whatsapp, "237694327885");
});

test("modèles phares : rang, rendus réduits, visionneuse échappée, sans doublon de couverture", () => {
  const html = topModelsHtml([plan, { ...plan, coverImage: "" }]);
  assert.equal(html.match(/class="model"/g)?.length, 1);
  assert.match(html, /N°1/);
  assert.match(html, /Duplex &lt;D4-006&gt;/);
  assert.match(html, /src="\/media\/renders\/a\.webp\?w=480"/);
  assert.match(html, /2 vues/);
  assert.match(html, /Budget indicatif : 38 – 46 M FCFA/);
  assert.match(html, /data-imgs="\[&quot;\/media\/renders\/a\.webp\?w=828&quot;,&quot;\/media\/renders\/b\.webp\?w=828&quot;\]"/);
  assert.match(html, /terrain conseillé 300 m²/);
});

test("autres modèles : vignettes légères avec référence", () => {
  const html = moreModelsHtml([plan]);
  assert.match(html, /\?w=320/);
  assert.match(html, /D4-006 · 195 m² · 4 chambres/);
});

test("numéro camerounais : indicatif retiré, 9 chiffres en 6 ou 2", () => {
  assert.equal(cameroonPhone("6 71 23 45 67"), "671234567");
  assert.equal(cameroonPhone("+237 671 23 45 67"), "671234567");
  assert.equal(cameroonPhone("00237671234567"), "671234567");
  assert.equal(cameroonPhone("71234567"), null);
  assert.equal(cameroonPhone("771234567"), null);
});

test("commande : champs obligatoires et ville libre hors Yaoundé / Douala", () => {
  const base = { name: "Jean", phone: "671234567", city: "Douala", district: "Bonamoussadi", project: "duplex", timing: "6mois" };
  assert.ok("order" in parseOrder(base));
  assert.match((parseOrder({ ...base, phone: "12" }) as { error: string }).error, /numéro/);
  assert.match((parseOrder({ ...base, city: "autre", otherCity: "" }) as { error: string }).error, /ville/);
  assert.match((parseOrder({ ...base, timing: "demain" }) as { error: string }).error, /quand/);
  const other = parseOrder({ ...base, city: "autre", otherCity: "Bafoussam" });
  assert.ok("order" in other && other.order.city === "Bafoussam");
});

test("message WhatsApp : produit, prix, référence, livraison, projet", () => {
  const r = parseOrder({ name: "Jean Mbarga", phone: "671234567", city: "Yaoundé", district: "Bastos", project: "villa", timing: "1an" });
  assert.ok("order" in r);
  const msg = orderMessage(r.order, orderRef("ab12cd34"), 49000, 100).replace(/ /g, " ");
  assert.match(msg, /Catalogue Premium imprimé\* \(100 plans/);
  assert.match(msg, /49 000 FCFA/);
  assert.match(msg, /Commande CP-AB12C/);
  assert.match(msg, /Yaoundé, Bastos \(livraison gratuite, paiement à la livraison\)/);
  assert.match(msg, /une villa \(plain-pied\), construction d'ici 1 an/);
  assert.doesNotMatch(msg, /expire/);
  const other = parseOrder({ name: "Awa", phone: "699000000", city: "autre", otherCity: "Garoua", district: "Centre", project: "duplex", timing: "info" });
  assert.ok("order" in other);
  assert.match(orderMessage(other.order, "CP-X", 49000, 100), /Garoua, Centre \(expédition gratuite\)/);
  assert.match(shortOrderMessage(other.order, "CP-X", 49000), /commande CP-X/);
  assert.match(whatsappUrl(msg, "237694327885"), /^https:\/\/wa\.me\/237694327885\?text=Bonjour/);
});
