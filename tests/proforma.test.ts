import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { buildProformaPdf, proformaTotals } from "../src/lib/proforma-pdf.ts";

test("totaux : remise plafonnée à 50 000, visite ajoutée, avance déduite", () => {
  assert.deepEqual(proformaTotals({ price: 300000, discount: 80000, deposit: 39000 }), { price: 300000, discount: 50000, visit: 0, total: 250000, deposit: 39000, balance: 211000 });
  assert.deepEqual(proformaTotals({ price: 200000, visit: 25000, deposit: 39000 }), { price: 200000, discount: 0, visit: 25000, total: 225000, deposit: 39000, balance: 186000 });
  assert.equal(proformaTotals({ price: 900000, discount: 120000, deposit: 39000, capDiscount: false }).discount, 120000);
  assert.equal(proformaTotals({ price: 200000, discount: -5, deposit: 39000 }).discount, 0);
});

test("PDF d'une page, lisible", async () => {
  const bytes = await buildProformaPdf({
    number: "PF-C-D4-AP-4821",
    date: new Date("2026-11-25T10:00:00Z"),
    client: { name: "Paul Mbarga", phone: "+237 6 99 00 00 00", city: "Yaoundé" },
    projectLabel: "Duplex · 4 chambres",
    dossier: "C-D4-AP-4821",
    model: "D4-034",
    relief: "plat",
    price: 300000,
    discount: 20000,
    deposit: 39000,
    deliverables: ["Plans de fondation", "Devis de construction du gros œuvre"],
    delivery: "7 jours ouvrables",
    payment: { method: "Orange Money", number: "656 71 35 03", holder: "Tawokam Romuald" },
    catalogueUrl: "wooplans.com/catalogue",
  });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
});
