import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

/**
 * Fiche PDF d'un modèle, assemblée à la volée depuis les données de la fiche.
 * Module pur (pdf-lib uniquement) : aucune dépendance au Worker, testable sous Node.
 * Les images arrivent déjà en JPEG ou PNG (pdf-lib ne lit pas le WebP).
 */

export type PdfImage = { bytes: Uint8Array; type: "jpg" | "png" };
/** Distribution cotée : image, ou PDF dont les pages sont recopiées telles quelles. */
export type PdfFloorPlan = PdfImage | { bytes: Uint8Array; type: "pdf" };

export type PlanPdfData = {
  code: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  levels: number;
  surfaceTotal: number;
  footprint: number | null;
  buildingWidth: number | null;
  buildingDepth: number | null;
  landArea: number | null;
  landWidth: number | null;
  landDepth: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  rooms: { name: string; area: number; level?: string }[];
  estimateTotal: number | null;
  estimateLots: { label: string; amount: number }[];
  costAssumptions: string;
  strengths: string[];
  watchouts: string[];
  premiumNotes: string;
};

export type PlanPdfInput = {
  plan: PlanPdfData;
  cover?: PdfImage | null;
  renders?: PdfImage[];
  floorPlans?: PdfFloorPlan[];
  /** Logo blanc (PNG) affiché sur le bandeau vert. */
  logo?: Uint8Array | null;
  /** Mention de bas de page (filigrane texte) et dessin du filigrane sur chaque page. */
  footer: string;
  stamp?: (page: PDFPage, font: PDFFont) => void;
  siteUrl?: string;
  date?: Date;
};

const A4: [number, number] = [595.28, 841.89];
const M = 42;
const TEAL = rgb(15 / 255, 91 / 255, 89 / 255);
const ORANGE = rgb(240 / 255, 138 / 255, 46 / 255);
const DARK = rgb(30 / 255, 41 / 255, 51 / 255);
const GRAY = rgb(107 / 255, 114 / 255, 128 / 255);
const LIGHT = rgb(245 / 255, 247 / 255, 249 / 255);
const LINE = rgb(0.88, 0.9, 0.92);

const CATEGORY: Record<string, string> = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble", autre: "Autre" };

/* Les polices standard PDF n'encodent que le jeu WinAnsi : on remplace le reste. */
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
export function pdfSafe(text: string) {
  return text
    .normalize("NFC")
    .replace(/[    ]/g, " ")
    .replace(/[≈∼]/g, "~")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/[\t\r]/g, " ")
    .replace(/./gu, (c) => {
      const code = c.codePointAt(0)!;
      if (c === "\n") return c;
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(c)) return c;
      return "";
    });
}

export function fcfa(value: number | null | undefined) {
  if (!value) return "—";
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

const num = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[  ]/g, " ");
const dims = (w: number | null, d: number | null) => (w && d ? `${num(w)} m × ${num(d)} m` : null);

/** Coupe un texte en lignes tenant dans `width` (respecte les retours à la ligne). */
export function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of pdfSafe(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
        // Mot plus long que la ligne : coupé de force.
        while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Caractéristiques affichées sur la première page (les champs vides sont omis). */
export function planSpecs(plan: PlanPdfData) {
  const budget =
    plan.budgetMin && plan.budgetMax && plan.budgetMax > plan.budgetMin
      ? `${fcfa(plan.budgetMin)} – ${fcfa(plan.budgetMax)}`
      : plan.budgetMin || plan.budgetMax
        ? fcfa(plan.budgetMin || plan.budgetMax)
        : null;
  const specs: [string, string | null][] = [
    ["Chambres", plan.bedrooms ? String(plan.bedrooms) : null],
    ["Salles de bain", plan.bathrooms ? String(plan.bathrooms) : null],
    ["Niveaux", plan.levels <= 1 ? "Plain-pied" : plan.levels === 2 ? "R+1" : `R+${plan.levels - 1}`],
    ["Surface habitable", plan.surfaceTotal ? `${plan.surfaceTotal} m²` : null],
    ["Emprise au sol", plan.footprint ? `${plan.footprint} m²` : null],
    ["Dimensions du bâtiment", dims(plan.buildingWidth, plan.buildingDepth)],
    ["Terrain conseillé", plan.landArea ? `${plan.landArea} m²${dims(plan.landWidth, plan.landDepth) ? ` (${dims(plan.landWidth, plan.landDepth)})` : ""}` : dims(plan.landWidth, plan.landDepth)],
    ["Budget indicatif", budget],
  ];
  return specs.filter((s): s is [string, string] => Boolean(s[1]));
}

export function fileName(code: string) {
  return `Fiche-WOOPLANS-${code.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

type Ctx = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  logo: PDFImage | null;
  input: PlanPdfInput;
  page: PDFPage;
  y: number;
};

function newPage(ctx: Ctx, title?: string) {
  ctx.page = ctx.doc.addPage(A4);
  const { page } = ctx;
  const [w, h] = A4;
  page.drawRectangle({ x: 0, y: h - 46, width: w, height: 46, color: TEAL });
  if (ctx.logo) {
    const scale = 26 / ctx.logo.height;
    page.drawImage(ctx.logo, { x: M, y: h - 36, width: ctx.logo.width * scale, height: 26 });
  }
  const ref = pdfSafe(`${ctx.input.plan.name} · Réf. ${ctx.input.plan.code}`);
  const size = 9.5;
  page.drawText(ref, { x: w - M - ctx.bold.widthOfTextAtSize(ref, size), y: h - 28, size, font: ctx.bold, color: rgb(1, 1, 1) });
  ctx.y = h - 46 - 30;
  if (title) heading(ctx, title);
}

function ensure(ctx: Ctx, needed: number, title?: string) {
  if (ctx.y - needed < M + 30) newPage(ctx, title);
}

function heading(ctx: Ctx, text: string) {
  ensure(ctx, 40);
  ctx.page.drawRectangle({ x: M, y: ctx.y - 2, width: 4, height: 16, color: ORANGE });
  ctx.page.drawText(pdfSafe(text), { x: M + 12, y: ctx.y, size: 14, font: ctx.bold, color: TEAL });
  ctx.y -= 26;
}

function paragraph(ctx: Ctx, text: string, size = 10, color = DARK) {
  const width = A4[0] - 2 * M;
  for (const line of wrapText(text, ctx.font, size, width)) {
    ensure(ctx, size + 4);
    if (line) ctx.page.drawText(line, { x: M, y: ctx.y, size, font: ctx.font, color });
    ctx.y -= size * 1.45;
  }
}

function bullets(ctx: Ctx, items: string[], marker: string, color = TEAL) {
  const width = A4[0] - 2 * M - 16;
  for (const item of items) {
    const lines = wrapText(item, ctx.font, 10, width);
    ensure(ctx, lines.length * 14.5 + 2);
    ctx.page.drawText(marker, { x: M, y: ctx.y, size: 10, font: ctx.bold, color });
    for (const line of lines) {
      ctx.page.drawText(line, { x: M + 16, y: ctx.y, size: 10, font: ctx.font, color: DARK });
      ctx.y -= 14.5;
    }
    ctx.y -= 2;
  }
}

/** Tableau à deux colonnes (libellé, valeur alignée à droite). */
function table(ctx: Ctx, rows: [string, string][], opts: { total?: [string, string]; continueTitle: string }) {
  const width = A4[0] - 2 * M;
  const rowH = 20;
  rows.forEach(([label, value], i) => {
    const labelLines = wrapText(label, ctx.font, 10, width - 150);
    const h = Math.max(rowH, labelLines.length * 13 + 7);
    if (ctx.y - h < M + 30) newPage(ctx, opts.continueTitle);
    if (i % 2 === 0) ctx.page.drawRectangle({ x: M, y: ctx.y - h + 13, width, height: h, color: LIGHT });
    labelLines.forEach((line, j) => ctx.page.drawText(line, { x: M + 8, y: ctx.y - j * 13, size: 10, font: ctx.font, color: DARK }));
    const v = pdfSafe(value);
    ctx.page.drawText(v, { x: M + width - 8 - ctx.bold.widthOfTextAtSize(v, 10), y: ctx.y, size: 10, font: ctx.bold, color: DARK });
    ctx.y -= h;
  });
  if (opts.total) {
    ensure(ctx, 28);
    ctx.page.drawRectangle({ x: M, y: ctx.y - 9, width, height: 24, color: TEAL });
    const [label, value] = opts.total.map(pdfSafe);
    ctx.page.drawText(label, { x: M + 8, y: ctx.y, size: 11, font: ctx.bold, color: rgb(1, 1, 1) });
    ctx.page.drawText(value, { x: M + width - 8 - ctx.bold.widthOfTextAtSize(value, 11), y: ctx.y, size: 11, font: ctx.bold, color: rgb(1, 1, 1) });
    ctx.y -= 30;
  }
  ctx.y -= 8;
}

/** Image ajustée dans un cadre (proportions conservées), centrée horizontalement. */
function drawFitted(page: PDFPage, image: PDFImage, x: number, top: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, { x: x + (maxW - w) / 2, y: top - h, width: w, height: h });
  return h;
}

async function embed(doc: PDFDocument, image: PdfImage) {
  try {
    return image.type === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
  } catch {
    return null;
  }
}

export async function buildPlanPdf(input: PlanPdfInput): Promise<Uint8Array> {
  const { plan } = input;
  const doc = await PDFDocument.create();
  const date = input.date ?? new Date();
  doc.setTitle(pdfSafe(`${plan.name} — fiche WOOPLANS`));
  doc.setAuthor("WOOPLANS");
  doc.setSubject(pdfSafe(input.footer));
  doc.setCreationDate(date);
  doc.setModificationDate(date);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = input.logo ? await embed(doc, { bytes: input.logo, type: "png" }) : null;
  const ctx: Ctx = { doc, font, bold, logo, input, page: null as unknown as PDFPage, y: 0 };
  const contentW = A4[0] - 2 * M;

  /* 1. Couverture : rendu principal, titre, caractéristiques, présentation. */
  newPage(ctx);
  ctx.page.drawText(pdfSafe(`${CATEGORY[plan.category] ?? plan.category} · Réf. ${plan.code}`).toUpperCase(), { x: M, y: ctx.y, size: 9, font: bold, color: ORANGE });
  ctx.y -= 26;
  for (const line of wrapText(plan.name, bold, 24, contentW)) {
    ctx.page.drawText(line, { x: M, y: ctx.y, size: 24, font: bold, color: DARK });
    ctx.y -= 28;
  }
  if (plan.summary) {
    paragraph(ctx, plan.summary, 11, GRAY);
  }
  ctx.y -= 6;
  const cover = input.cover ? await embed(doc, input.cover) : null;
  if (cover) {
    const h = drawFitted(ctx.page, cover, M, ctx.y, contentW, 300);
    ctx.y -= h + 18;
  }
  const specs = planSpecs(plan);
  const colW = contentW / 2;
  specs.forEach(([label, value], i) => {
    const col = i % 2;
    if (col === 0) ensure(ctx, 34);
    const x = M + col * colW;
    ctx.page.drawText(pdfSafe(label).toUpperCase(), { x, y: ctx.y, size: 7.5, font: bold, color: GRAY });
    ctx.page.drawText(pdfSafe(value), { x, y: ctx.y - 14, size: 12, font: bold, color: DARK });
    if (col === 1 || i === specs.length - 1) ctx.y -= 34;
  });
  if (plan.description) {
    ctx.y -= 4;
    heading(ctx, "Présentation");
    paragraph(ctx, plan.description);
  }

  /* 2. Distributions cotées : une page chacune, la plus grande possible. */
  for (const [i, fp] of (input.floorPlans ?? []).entries()) {
    if (fp.type === "pdf") {
      try {
        const source = await PDFDocument.load(fp.bytes, { ignoreEncryption: true });
        const pages = await doc.copyPages(source, source.getPageIndices());
        pages.forEach((p) => doc.addPage(p));
      } catch {
        /* PDF illisible : ignoré, la distribution reste consultable dans l'espace Premium. */
      }
      continue;
    }
    const image = await embed(doc, fp);
    if (!image) continue;
    newPage(ctx, `Distribution cotée ${(input.floorPlans?.length ?? 0) > 1 ? i + 1 : ""}`.trim());
    drawFitted(ctx.page, image, M, ctx.y, contentW, ctx.y - M - 30);
  }

  /* 3. Pièces, devis, atouts et points de vigilance. */
  const premiumSections = plan.rooms.length || plan.estimateLots.length || plan.estimateTotal || plan.strengths.length || plan.watchouts.length || plan.costAssumptions || plan.premiumNotes;
  if (premiumSections) newPage(ctx);
  if (plan.rooms.length) {
    heading(ctx, "Pièces et surfaces");
    const byLevel = new Map<string, [string, string][]>();
    for (const room of plan.rooms) {
      const level = room.level || (plan.levels > 1 ? "Rez-de-chaussée" : "Plain-pied");
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push([room.name, room.area ? `${num(room.area)} m²` : "—"]);
    }
    for (const [level, rows] of byLevel) {
      if (byLevel.size > 1) {
        ensure(ctx, 40);
        ctx.page.drawText(pdfSafe(level), { x: M, y: ctx.y, size: 10.5, font: bold, color: TEAL });
        ctx.y -= 18;
      }
      table(ctx, rows, { continueTitle: "Pièces et surfaces (suite)" });
    }
  }
  const lotsTotal = plan.estimateLots.reduce((sum, lot) => sum + (lot.amount || 0), 0);
  const estimate = plan.estimateTotal || lotsTotal || null;
  if (plan.estimateLots.length || estimate) {
    heading(ctx, "Devis estimatif de construction");
    table(
      ctx,
      plan.estimateLots.map((lot) => [lot.label, fcfa(lot.amount)]),
      { total: estimate ? ["Total estimatif", fcfa(estimate)] : undefined, continueTitle: "Devis estimatif (suite)" },
    );
    paragraph(ctx, "Hors terrain, honoraires et raccordements. Montants indicatifs à confirmer avec votre entrepreneur selon les prix locaux.", 8.5, GRAY);
    if (plan.costAssumptions) {
      ctx.y -= 4;
      paragraph(ctx, `Hypothèses : ${plan.costAssumptions}`, 9.5, GRAY);
    }
    ctx.y -= 8;
  }
  if (plan.strengths.length) {
    heading(ctx, "Points forts");
    bullets(ctx, plan.strengths, "+");
    ctx.y -= 6;
  }
  if (plan.watchouts.length) {
    heading(ctx, "Points de vigilance");
    bullets(ctx, plan.watchouts, "!", ORANGE);
    ctx.y -= 6;
  }
  if (plan.premiumNotes) {
    heading(ctx, "Notes");
    paragraph(ctx, plan.premiumNotes);
  }

  /* 4. Rendus 3D : deux par page. */
  const renders = input.renders ?? [];
  for (let i = 0; i < renders.length; i += 2) {
    newPage(ctx, i === 0 ? "Rendus 3D" : "Rendus 3D (suite)");
    const half = (ctx.y - M - 30 - 16) / 2;
    for (const r of renders.slice(i, i + 2)) {
      const image = await embed(doc, r);
      if (!image) continue;
      const h = drawFitted(ctx.page, image, M, ctx.y, contentW, half);
      ctx.y -= h + 16;
    }
  }

  /* Pied de page et filigrane sur toutes les pages. */
  const pages = doc.getPages();
  const site = (input.siteUrl ?? "www.wooplans.com").replace(/^https?:\/\//, "");
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    input.stamp?.(page, bold);
    const footer = pdfSafe(input.footer);
    const fsize = 7;
    const fw = font.widthOfTextAtSize(footer, fsize);
    page.drawLine({ start: { x: M, y: M - 6 }, end: { x: width - M, y: M - 6 }, thickness: 0.5, color: LINE });
    page.drawText(fw > width - 2 * M - 70 ? footer.slice(0, 120) : footer, { x: M, y: M - 18, size: fsize, font, color: GRAY });
    const right = pdfSafe(`${site} · ${i + 1}/${pages.length}`);
    page.drawText(right, { x: width - M - font.widthOfTextAtSize(right, fsize), y: M - 18, size: fsize, font, color: GRAY });
  });

  return doc.save({ useObjectStreams: true });
}
