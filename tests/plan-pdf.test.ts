import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { buildPlanPdf, fcfa, fileName, pdfSafe, planSpecs, type PlanPdfData } from "../src/lib/plan-pdf.ts";
import { fingerprint, watermarkForMember } from "../src/lib/watermark.ts";

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
  assert.equal(mark.label, "Exemplaire de Awa · awa@exemple.com");
  assert.match(mark.footer, /awa@exemple\.com — 15\/10\/2026 — W-[0-9A-F]{6}$/);
});

test("buildPlanPdf : PDF valide avec images, distribution PDF et filigrane", async () => {
  const jpg = new Uint8Array(readFileSync(new URL("../public/assets/digital/floor-plan.jpg", import.meta.url)));
  const logo = new Uint8Array(readFileSync(new URL("../public/assets/wooplans-logo-white.png", import.meta.url)));
  const annex = await PDFDocument.create();
  annex.addPage([400, 300]);
  const annexBytes = await annex.save();
  const mark = watermarkForMember({ id: "m1", email: "awa@exemple.com" }, plan.code);
  let stamped = 0;
  const bytes = await buildPlanPdf({
    plan,
    cover: { bytes: jpg, type: "jpg" },
    renders: [{ bytes: jpg, type: "jpg" }, { bytes: jpg, type: "jpg" }, { bytes: jpg, type: "jpg" }],
    floorPlans: [{ bytes: jpg, type: "jpg" }, { bytes: annexBytes, type: "pdf" }, { bytes: new Uint8Array([1, 2, 3]), type: "jpg" }],
    logo,
    footer: mark.footer,
    stamp: () => stamped++,
  });
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  // couverture + distribution image + distribution PDF + pièces/devis + 2 pages de rendus
  assert.equal(doc.getPageCount(), 6);
  assert.equal(stamped, 6);
  assert.match(doc.getSubject() || "", /awa@exemple\.com/);
});

test("fileName : nom de fichier sûr", () => {
  assert.equal(fileName("V3-037"), "Fiche-WOOPLANS-V3-037.pdf");
  assert.equal(fileName('D4"/../x'), "Fiche-WOOPLANS-D4x.pdf");
});
