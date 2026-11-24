import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Proforma des plans complets (tunnel « Démarre ton chantier », décision de Tao du 25 nov. 2026), générée depuis la
 * fiche CRM et envoyée au prospect sur WhatsApp. Module pur (pdf-lib uniquement), testé dans tests/proforma.test.ts.
 */

export const PROFORMA_MAX_DISCOUNT = 50_000;

export type ProformaInput = {
  number: string;
  date: Date;
  client: { name: string; phone?: string | null; city?: string | null };
  /** Ex. « Duplex · 4 chambres », « Immeuble ». */
  projectLabel: string;
  /** Code du dossier (C-D4-AP-4821) et modèle de référence (pub cliquée), s'ils sont connus. */
  dossier?: string | null;
  model?: string | null;
  relief?: string | null;
  /** Prix des plans complets (FCFA). */
  price: number;
  /** Remise négociée (FCFA), plafonnée à 50 000 sauf pour un immeuble. */
  discount?: number;
  /** Visite de terrain (FCFA), si le terrain est en pente. */
  visit?: number;
  deposit: number;
  deliverables: readonly string[];
  delivery: string;
  payment: { method: string; number: string; holder: string };
  catalogueUrl: string;
  logo?: Uint8Array | null;
};

export function proformaTotals(p: { price: number; discount?: number; visit?: number; deposit: number; capDiscount?: boolean }) {
  const price = Math.max(0, Math.round(p.price));
  const cap = p.capDiscount === false ? price : Math.min(PROFORMA_MAX_DISCOUNT, price);
  const discount = Math.min(Math.max(0, Math.round(p.discount ?? 0)), cap);
  const visit = Math.max(0, Math.round(p.visit ?? 0));
  const total = price - discount + visit;
  const deposit = Math.min(p.deposit, total);
  return { price, discount, visit, total, deposit, balance: total - deposit };
}

export function fcfaPdf(n: number) {
  // Espace normale : la police standard du PDF n'a pas l'espace fine insécable.
  return `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}

const GREEN = rgb(15 / 255, 91 / 255, 89 / 255);
const DARK = rgb(10 / 255, 61 / 255, 59 / 255);
const GOLD = rgb(231 / 255, 195 / 255, 108 / 255);
const INK = rgb(0.1, 0.13, 0.13);
const MUTED = rgb(0.38, 0.45, 0.44);
const LINE = rgb(0.84, 0.88, 0.87);
const SOFT = rgb(0.95, 0.97, 0.96);

/** Coupe un texte en lignes qui tiennent dans `width`. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function buildProformaPdf(input: ProformaInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Proforma ${input.number} · WooPlans`);
  doc.setAuthor("WooPlans");
  const page: PDFPage = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const M = 48;
  const text = (s: string, x: number, y: number, size = 10, f = font, color = INK) => page.drawText(s, { x, y, size, font: f, color });
  const right = (s: string, xr: number, y: number, size = 10, f = font, color = INK) => text(s, xr - f.widthOfTextAtSize(s, size), y, size, f, color);

  // Bandeau.
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: GREEN });
  if (input.logo) {
    try {
      const img = await doc.embedPng(input.logo);
      const h = 30;
      page.drawImage(img, { x: M, y: height - 63, width: (img.width / img.height) * h, height: h });
    } catch {
      text("WOOPLANS", M, height - 56, 20, bold, rgb(1, 1, 1));
    }
  } else text("WOOPLANS", M, height - 56, 20, bold, rgb(1, 1, 1));
  right("PROFORMA", width - M, height - 50, 20, bold, GOLD);
  right(`N° ${input.number}`, width - M, height - 68, 10, font, rgb(0.85, 0.93, 0.92));
  const date = input.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  right(date, width - M, height - 82, 9, font, rgb(0.85, 0.93, 0.92));

  // Client et projet.
  let y = height - 130;
  text("CLIENT", M, y, 8, bold, MUTED);
  text("PROJET", width / 2 + 10, y, 8, bold, MUTED);
  y -= 16;
  const leftLines = [input.client.name, input.client.phone ?? "", input.client.city ? `Ville du chantier : ${input.client.city}` : ""].filter(Boolean);
  const rightLines = [
    `Plans complets · ${input.projectLabel}`,
    input.model ? `Modèle de référence : ${input.model}` : "",
    input.relief ? `Terrain : ${input.relief}` : "",
    input.dossier ? `Dossier : ${input.dossier}` : "",
  ].filter(Boolean);
  for (let i = 0; i < Math.max(leftLines.length, rightLines.length); i++) {
    if (leftLines[i]) text(leftLines[i], M, y, i === 0 ? 12 : 10, i === 0 ? bold : font);
    if (rightLines[i]) text(rightLines[i], width / 2 + 10, y, i === 0 ? 12 : 10, i === 0 ? bold : font);
    y -= i === 0 ? 17 : 14;
  }

  // Livrables.
  y -= 14;
  text("CE QUI VOUS EST LIVRÉ", M, y, 8, bold, MUTED);
  y -= 8;
  const colW = (width - 2 * M - 16) / 2;
  const half = Math.ceil(input.deliverables.length / 2);
  const boxH = half * 17 + 16;
  page.drawRectangle({ x: M, y: y - boxH, width: width - 2 * M, height: boxH, color: SOFT });
  input.deliverables.forEach((d, i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const x = M + 12 + col * (colW + 16);
    const yy = y - 20 - row * 17;
    page.drawCircle({ x: x + 3, y: yy + 3.5, size: 2.6, color: GREEN });
    text(d, x + 12, yy, 10);
  });
  y -= boxH + 10;
  text(`Délai de livraison : ${input.delivery} après l'avance et la réception des informations du terrain.`, M, y, 9.5, font, MUTED);

  // Montants.
  const t = proformaTotals({ price: input.price, discount: input.discount, visit: input.visit, deposit: input.deposit, capDiscount: !/immeuble/i.test(input.projectLabel) });
  y -= 30;
  text("DÉSIGNATION", M, y, 8, bold, MUTED);
  right("MONTANT", width - M, y, 8, bold, MUTED);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: LINE });
  const row = (label: string, amount: string, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    y -= 20;
    text(label, M, y, 10.5, opts.bold ? bold : font, opts.color ?? INK);
    right(amount, width - M, y, 10.5, opts.bold ? bold : font, opts.color ?? INK);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.6, color: LINE });
  };
  row(`Plans complets · ${input.projectLabel}`, fcfaPdf(t.price));
  if (t.discount > 0) row("Remise accordée", `- ${fcfaPdf(t.discount)}`, { color: GREEN });
  if (t.visit > 0) row("Visite de terrain", fcfaPdf(t.visit));
  // Total.
  y -= 30;
  page.drawRectangle({ x: M, y: y - 8, width: width - 2 * M, height: 30, color: DARK });
  text("TOTAL", M + 12, y + 2, 12, bold, rgb(1, 1, 1));
  right(fcfaPdf(t.total), width - M - 12, y + 2, 12, bold, GOLD);
  y -= 30;

  // Échéancier.
  const step = (title: string, amount: string, note: string) => {
    y -= 22;
    text(title, M, y, 11, bold);
    right(amount, width - M, y, 11, bold, GREEN);
    for (const l of wrap(note, font, 9.5, width - 2 * M - 120)) {
      y -= 13;
      text(l, M, y, 9.5, font, MUTED);
    }
  };
  step(
    "1. Avance à la commande",
    fcfaPdf(t.deposit),
    "Déduite du total. Elle vous ouvre tout de suite l'accès au Catalogue Premium, et nous créons le groupe WhatsApp de votre projet.",
  );
  step("2. Solde", fcfaPdf(t.balance), "Réglé avant la livraison des plans complets.");

  // Paiement.
  y -= 28;
  page.drawRectangle({ x: M, y: y - 44, width: width - 2 * M, height: 56, color: SOFT, borderColor: GOLD, borderWidth: 1 });
  text("PAIEMENT", M + 12, y - 2, 8, bold, MUTED);
  text(`${input.payment.method} : ${input.payment.number}`, M + 12, y - 19, 13, bold, DARK);
  text(`Au nom de ${input.payment.holder}. Envoyez la capture du paiement sur WhatsApp avec votre numéro de dossier.`, M + 12, y - 35, 9, font, MUTED);
  y -= 70;

  // Catalogue.
  text("Pour vous inspirer et comparer les modèles :", M, y, 10, font, MUTED);
  text(input.catalogueUrl, M + font.widthOfTextAtSize("Pour vous inspirer et comparer les modèles : ", 10), y, 10, bold, GREEN);

  // Pied de page.
  page.drawLine({ start: { x: M, y: 56 }, end: { x: width - M, y: 56 }, thickness: 0.6, color: LINE });
  text("WooPlans · Plans de maisons pour l'Afrique · wooplans.com", M, 40, 8.5, font, MUTED);
  right("Proforma sans valeur de facture", width - M, 40, 8.5, font, MUTED);

  return doc.save();
}
