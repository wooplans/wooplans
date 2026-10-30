import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { buildPlanPdf, fcfa, fileName, minimumLand, pdfSafe, planSpecs, usageTerms, type PlanPdfData } from "../src/lib/plan-pdf.ts";
import { fingerprint, imageMarkForMember, watermarkForMember } from "../src/lib/watermark.ts";
import { encodePng, imageSize, rasterText, renderOverlay, watermarkOverlayPng } from "../src/lib/watermark-raster.ts";

const plan: PlanPdfData = {
  code: "V3-037",
  name: "Villa V3-037",
  category: "villa",
  summary: "",
  description: "Villa moderne de plain-pied : grand salon ouvert sur la cuisine, garage intégré et deux terrasses.",
  bedrooms: 3,
  bathrooms: 2,
  levels: 1,
  surfaceTotal: 164,
  footprint: null,
  buildingWidth: 14.5,
  buildingDepth: 11.2,
  landArea: 400,
  landWidth: null,
  landDepth: null,
  budgetMin: 29_500_000,
  budgetMax: 36_100_000,
  rooms: [
    { name: "Salon", area: 23 },
    { name: "Chambre parentale", area: 20 },
  ],
  estimateTotal: 32_816_000,
  estimateLots: [
    { label: "Fondation", amount: 4_005_200 },
    { label: "Élévations", amount: 5_864_800 },
  ],
  costAssumptions: "Finitions standard, hors terrain, VRD et honoraires.",
  strengths: ["Garage intégré"],
  watchouts: ["Prévoir un terrain d’au moins 400 m² ≈ 20 × 20 m"],
  premiumNotes: "",
};

test("pdfSafe : caractères hors WinAnsi remplacés", () => {
  assert.equal(pdfSafe("≈ 20 m² — d’accord 🏠"), "~ 20 m² — d’accord ");
});

test("fcfa : séparateur de milliers sans espace insécable", () => {
  assert.equal(fcfa(32816000), "32 816 000 FCFA");
  assert.equal(fcfa(null), "—");
});

test("planSpecs : champs vides omis, budget en fourchette", () => {
  const specs = Object.fromEntries(planSpecs(plan));
  assert.equal(specs["Niveaux"], "Plain-pied");
  assert.equal(specs["Budget indicatif"], "29 500 000 FCFA – 36 100 000 FCFA");
  assert.equal(specs["Emprise au sol"], undefined);
  assert.equal(specs["Terrain conseillé"], "400 m²");
});

test("filigrane : empreinte stable par membre et par modèle", () => {
  assert.equal(fingerprint("m1", "V3-037"), fingerprint("m1", "V3-037"));
  assert.notEqual(fingerprint("m1", "V3-037"), fingerprint("m2", "V3-037"));
  const mark = watermarkForMember({ id: "m1", email: "awa@exemple.com", name: "Awa" }, "V3-037", new Date("2026-10-15T10:00:00Z"));
  assert.equal(mark.label, `Exemplaire de Awa · awa@exemple.com · ${mark.id}`);
  assert.match(mark.footer, /awa@exemple\.com — 15\/10\/2026 — W-[0-9A-F]{6} — /);
  assert.match(mark.brand, /www\.wooplans\.com · Plan V3-037/);
  assert.ok(mark.rasterLines.every((l) => l.length > 10));
  assert.ok(mark.rasterLines.some((l) => l.includes(mark.id)));
  assert.notEqual(imageMarkForMember({ id: "m1", email: "a@b.c" }).id, mark.id);
});

test("buildPlanPdf : PDF valide avec images, distribution PDF et filigrane", async () => {
  const jpg = new Uint8Array(readFileSync(new URL("../public/assets/digital/floor-plan.jpg", import.meta.url)));
  const logo = new Uint8Array(readFileSync(new URL("../public/assets/wooplans-logo-white.png", import.meta.url)));
  // PDF source complet (3 pages) : seule sa 1re page doit entrer dans la fiche, sur une page WOOPLANS.
  const annex = await PDFDocument.create();
  for (let i = 0; i < 3; i++) annex.addPage([400, 300]).drawText(`Page source ${i + 1}`, { x: 20, y: 150 });
  const annexBytes = await annex.save();
  const mark = watermarkForMember({ id: "m1", email: "awa@exemple.com" }, plan.code);
  const bytes = await buildPlanPdf({
    plan,
    cover: { bytes: jpg, type: "jpg" },
    renders: [{ bytes: jpg, type: "jpg" }, { bytes: jpg, type: "jpg" }, { bytes: jpg, type: "jpg" }],
    floorPlans: [{ bytes: jpg, type: "jpg" }, { bytes: annexBytes, type: "pdf" }, { bytes: new Uint8Array([1, 2, 3]), type: "jpg" }],
    logo,
    footer: mark.footer,
    watermarkLines: [mark.label, mark.brand],
    licensee: { name: "Awa (awa@exemple.com)", id: mark.id },
    sourceUrl: "https://www.wooplans.com/catalogue/villa-v3-037",
  });
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  // couverture + distribution image + distribution PDF + terrain + pièces/devis + 2 pages de rendus + conditions
  assert.equal(doc.getPageCount(), 8);
  assert.match(doc.getSubject() || "", /awa@exemple\.com/);
  assert.match(doc.getKeywords() || "", new RegExp(mark.id));
  // Lien « Source » cliquable sur chaque page.
  for (const page of doc.getPages()) assert.ok(page.node.Annots()?.size());
});

test("fileName : nom de fichier sûr", () => {
  assert.equal(fileName("V3-037"), "Fiche-WOOPLANS-V3-037.pdf");
  assert.equal(fileName('D4"/../x'), "Fiche-WOOPLANS-D4x.pdf");
});

test("usageTerms : interdictions et identifiant de l'exemplaire", () => {
  const terms = usageTerms("www.wooplans.com", { name: "Awa", id: "W-ABC123" });
  assert.match(terms.intro, /délivré à Awa/);
  assert.ok(terms.forbidden.some((t) => /réseaux sociaux/.test(t)));
  assert.ok(terms.forbidden.some((t) => /commerciales ou publicitaires/.test(t)));
  assert.match(terms.tracing, /W-ABC123/);
});

test("filigrane incrusté : texte normalisé pour la police matricielle", () => {
  assert.equal(rasterText("Éloïse · awa@exemple.com — ok"), "ELOISE · AWA@EXEMPLE.COM - OK");
  assert.equal(rasterText("日本"), "??");
});

test("filigrane incrusté : calque couvert de texte, PNG valide aux bonnes dimensions", async () => {
  const rgba = renderOverlay(300, 200, { lines: ["WOOPLANS.COM", "W-ABC123"] });
  let inked = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) inked++;
  const ratio = inked / (300 * 200);
  assert.ok(ratio > 0.03 && ratio < 0.5, `couverture ${ratio}`);
  const png = await encodePng(rgba, 300, 200);
  assert.deepEqual([...png.subarray(1, 4)], [0x50, 0x4e, 0x47]);
  assert.deepEqual(imageSize(png), { width: 300, height: 200 });
  const overlay = await watermarkOverlayPng(1800, 1200, ["A", "B"], "plan");
  assert.equal(overlay.width, 900);
  assert.equal(overlay.height, 600);
});

test("imageSize : lit les dimensions d'un JPEG", () => {
  const jpg = new Uint8Array(readFileSync(new URL("../public/assets/digital/floor-plan.jpg", import.meta.url)));
  const size = imageSize(jpg);
  assert.ok(size && size.width > 0 && size.height > 0);
  assert.equal(imageSize(new Uint8Array([1, 2, 3])), null);
});

test("terrain minimum : 1,5 m sur les côtés, 5 m devant, 2 m derrière", () => {
  const land = minimumLand(14.45, 12.86);
  assert.equal(land.width, 17.45);
  assert.equal(Math.round(land.depth * 100) / 100, 19.86);
  assert.equal(Math.ceil(land.area), 347);
});
