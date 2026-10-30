import { PDFDocument, PDFString, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

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
  /** Mention de bas de page : titulaire de l'exemplaire, date, identifiant. */
  footer: string;
  /** Lignes du filigrane diagonal, répétées en alternance sur toute la page. */
  watermarkLines?: string[];
  /** Titulaire et identifiant de l'exemplaire, repris dans les conditions d'utilisation. */
  licensee?: { name: string; id: string };
  siteUrl?: string;
  /** Page publique du modèle : lien « Source » cliquable en bas de chaque page. */
  sourceUrl?: string;
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
const CREAM = rgb(1, 0.97, 0.93);

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

/** Postes du gros œuvre (repris des devis du catalogue) ; les autres postes sont des finitions. */
const GROS_OEUVRE = new Set(["fondation", "elevations", "charpente et toiture"]);
const lotKey = (label: string) => label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Devis par poste : numéro (100, 200…), poste, montant, part du total avec une barre, sous-totaux
 * gros œuvre / finitions quand les postes du catalogue sont reconnus, puis total.
 */
function estimateTable(ctx: Ctx, lots: { label: string; amount: number }[], total: number | null) {
  const width = A4[0] - 2 * M;
  const sum = total || lots.reduce((s, l) => s + (l.amount || 0), 0);
  const xNum = M + 8;
  const xLabel = M + 46;
  const amountRight = M + width - 118;
  const barX = M + width - 104;
  const barW = 56;
  const pctRight = M + width - 8;
  const rowH = 22;
  const header = () => {
    ensure(ctx, 30 + rowH);
    ctx.page.drawRectangle({ x: M, y: ctx.y - 8, width, height: 22, color: TEAL });
    const white = rgb(1, 1, 1);
    ctx.page.drawText("N°", { x: xNum, y: ctx.y, size: 8.5, font: ctx.bold, color: white });
    ctx.page.drawText("POSTE", { x: xLabel, y: ctx.y, size: 8.5, font: ctx.bold, color: white });
    const a = "MONTANT";
    ctx.page.drawText(a, { x: amountRight - ctx.bold.widthOfTextAtSize(a, 8.5), y: ctx.y, size: 8.5, font: ctx.bold, color: white });
    const p = "PART";
    ctx.page.drawText(p, { x: pctRight - ctx.bold.widthOfTextAtSize(p, 8.5), y: ctx.y, size: 8.5, font: ctx.bold, color: white });
    ctx.y -= 26;
  };
  const right = (text: string, xr: number, size: number, font: PDFFont, color = DARK) => {
    const t = pdfSafe(text);
    ctx.page.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y: ctx.y, size, font, color });
  };
  const pct = (amount: number) => (sum > 0 ? amount / sum : 0);
  const pctText = (amount: number) => `${(pct(amount) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

  const known = lots.length > 0 && lots.every((l) => l.label);
  const gros = lots.filter((l) => GROS_OEUVRE.has(lotKey(l.label)));
  const groups =
    known && gros.length > 0 && gros.length < lots.length
      ? [
          { title: "Gros œuvre", lots: gros },
          { title: "Finitions", lots: lots.filter((l) => !GROS_OEUVRE.has(lotKey(l.label))) },
        ]
      : [{ title: "", lots }];

  header();
  let n = 0;
  for (const group of groups) {
    if (group.title) {
      ensure(ctx, rowH * 2);
      ctx.page.drawText(pdfSafe(group.title).toUpperCase(), { x: xNum, y: ctx.y, size: 8.5, font: ctx.bold, color: ORANGE });
      ctx.y -= 18;
    }
    for (const lot of group.lots) {
      n += 1;
      if (ctx.y - rowH < M + 30) {
        newPage(ctx, "Devis estimatif (suite)");
        header();
      }
      if (n % 2 === 1) ctx.page.drawRectangle({ x: M, y: ctx.y - 8, width, height: rowH, color: LIGHT });
      ctx.page.drawText(String(n * 100), { x: xNum, y: ctx.y, size: 9, font: ctx.font, color: GRAY });
      ctx.page.drawText(pdfSafe(lot.label), { x: xLabel, y: ctx.y, size: 10, font: ctx.font, color: DARK });
      right(fcfa(lot.amount), amountRight, 10, ctx.bold);
      ctx.page.drawRectangle({ x: barX, y: ctx.y - 1, width: barW, height: 6, color: rgb(0.88, 0.91, 0.91) });
      ctx.page.drawRectangle({ x: barX, y: ctx.y - 1, width: Math.max(1, barW * Math.min(1, pct(lot.amount) / 0.25)), height: 6, color: TEAL });
      right(pctText(lot.amount), pctRight, 8.5, ctx.font, GRAY);
      ctx.y -= rowH;
    }
    if (group.title) {
      const subtotal = group.lots.reduce((s, l) => s + (l.amount || 0), 0);
      ensure(ctx, rowH);
      ctx.page.drawRectangle({ x: M, y: ctx.y - 8, width, height: rowH, color: CREAM });
      ctx.page.drawText(pdfSafe(`Sous-total ${group.title.toLowerCase()}`), { x: xLabel, y: ctx.y, size: 10, font: ctx.bold, color: DARK });
      right(fcfa(subtotal), amountRight, 10, ctx.bold);
      right(pctText(subtotal), pctRight, 8.5, ctx.bold, DARK);
      ctx.y -= rowH + 6;
    }
  }
  if (sum > 0) {
    ensure(ctx, 32);
    ctx.page.drawRectangle({ x: M, y: ctx.y - 10, width, height: 28, color: TEAL });
    const white = rgb(1, 1, 1);
    ctx.page.drawText("Total estimatif clé en main", { x: xLabel, y: ctx.y, size: 11.5, font: ctx.bold, color: white });
    right(fcfa(sum), pctRight, 12, ctx.bold, white);
    ctx.y -= 34;
  }
  ctx.y -= 6;
}

/** Reculs utilisés pour estimer le terrain minimum (mètres). */
export const SETBACKS = { front: 5, back: 2, side: 1.5 };

/** Terrain minimum estimé : largeur (façade), profondeur et surface, à partir de l'encombrement de la maison. */
export function minimumLand(buildingWidth: number, buildingDepth: number) {
  const width = buildingWidth + 2 * SETBACKS.side;
  const depth = buildingDepth + SETBACKS.front + SETBACKS.back;
  return { width, depth, area: width * depth };
}

const m = (v: number) => `${num(v)} m`;
const GREEN = rgb(0.9, 0.95, 0.91);
const GREEN_LINE = rgb(0.33, 0.6, 0.38);
const ROAD = rgb(0.84, 0.85, 0.86);

/**
 * Schéma du terrain minimum : parcelle (reculs 5 m devant, 2 m derrière, 1,5 m sur les côtés), emprise de la
 * maison, route devant la façade, cotes et encadré « estimation ». Façade = largeur du bâtiment, côté route.
 */
function terrainSketch(ctx: Ctx, buildingWidth: number, buildingDepth: number) {
  const { page, font, bold } = ctx;
  const land = minimumLand(buildingWidth, buildingDepth);
  const contentW = A4[0] - 2 * M;
  const centered = (text: string, cx: number, y: number, size: number, f = font, color = DARK) => {
    const t = pdfSafe(text);
    page.drawText(t, { x: cx - f.widthOfTextAtSize(t, size) / 2, y, size, font: f, color });
  };
  const arrowHead = (x: number, y: number, dir: "up" | "down" | "left" | "right", color = DARK, size = 4) => {
    const pts = {
      up: [[x, y], [x - size, y - size * 1.6], [x + size, y - size * 1.6]],
      down: [[x, y], [x - size, y + size * 1.6], [x + size, y + size * 1.6]],
      left: [[x, y], [x + size * 1.6, y - size], [x + size * 1.6, y + size]],
      right: [[x, y], [x - size * 1.6, y - size], [x - size * 1.6, y + size]],
    }[dir];
    // Coordonnées SVG (y vers le bas) relatives à l'origine (0, hauteur de page).
    const path = `M ${pts[0][0]} ${-pts[0][1]} L ${pts[1][0]} ${-pts[1][1]} L ${pts[2][0]} ${-pts[2][1]} Z`;
    page.drawSvgPath(path, { x: 0, y: 0, color, borderWidth: 0 });
  };
  /** Cote horizontale (flèches aux deux bouts, texte au-dessus). */
  const hDim = (x1: number, x2: number, y: number, label: string, color = DARK, labelX?: number, align: "left" | "right" = "left") => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.7, color });
    arrowHead(x1, y, "left", color, 3);
    arrowHead(x2, y, "right", color, 3);
    if (labelX === undefined) return centered(label, (x1 + x2) / 2, y + 4, 8.5, bold, color);
    // Recul étroit : texte posé à côté de la cote, dans la maison, pour ne pas chevaucher la limite du terrain.
    const t = pdfSafe(label);
    const w = bold.widthOfTextAtSize(t, 8.5);
    page.drawText(t, { x: align === "left" ? labelX : labelX - w, y: y - 3, size: 8.5, font: bold, color });
  };
  /** Cote verticale (flèches aux deux bouts, texte tourné à gauche de la ligne). */
  const vDim = (x: number, y1: number, y2: number, label: string, color = DARK) => {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 0.7, color });
    arrowHead(x, Math.min(y1, y2), "down", color, 3);
    arrowHead(x, Math.max(y1, y2), "up", color, 3);
    const t = pdfSafe(label);
    const w = bold.widthOfTextAtSize(t, 8.5);
    page.drawText(t, { x: x - 4, y: (y1 + y2) / 2 - w / 2, size: 8.5, font: bold, color, rotate: degrees(90) });
  };

  // Cadre du dessin : place pour les cotes à gauche et en haut, la route et la flèche en bas.
  const top = ctx.y - 26;
  const roadH = 34;
  const boxH = 400;
  const left = M + 40;
  const availW = contentW - 80;
  const scale = Math.min(availW / land.width, (boxH - roadH - 40) / land.depth);
  const plotW = land.width * scale;
  const plotH = land.depth * scale;
  const px = left + (availW - plotW) / 2;
  const py = top - plotH; // bas de la parcelle (côté route)

  // Parcelle.
  page.drawRectangle({ x: px, y: py, width: plotW, height: plotH, color: GREEN, borderColor: GREEN_LINE, borderWidth: 1.4, borderDashArray: [6, 3] });
  // Maison : 1,5 m des côtés, 5 m de l'avant (route), 2 m de l'arrière.
  const hx = px + SETBACKS.side * scale;
  const hy = py + SETBACKS.front * scale;
  const hw = buildingWidth * scale;
  const hh = buildingDepth * scale;
  page.drawRectangle({ x: hx, y: hy, width: hw, height: hh, color: rgb(0.85, 0.92, 0.92), borderColor: TEAL, borderWidth: 2 });
  centered("MAISON (emprise)", hx + hw / 2, hy + hh / 2 + 6, 10, bold, TEAL);
  centered(`${m(buildingWidth)} × ${m(buildingDepth)}`, hx + hw / 2, hy + hh / 2 - 9, 9.5, font, TEAL);

  // Reculs (cotes en orange).
  const setbackColor = ORANGE;
  vDim(hx + hw / 2, py, hy, `${m(SETBACKS.front)} devant`, setbackColor);
  vDim(hx + hw / 2, hy + hh, py + plotH, `${m(SETBACKS.back)}`, setbackColor);
  hDim(px, hx, hy + hh * 0.25, m(SETBACKS.side), setbackColor, hx + 5, "left");
  hDim(hx + hw, px + plotW, hy + hh * 0.25, m(SETBACKS.side), setbackColor, hx + hw - 5, "right");

  // Cotes du terrain (en haut et à gauche).
  hDim(px, px + plotW, py + plotH + 14, `Largeur du terrain (façade) : ${m(land.width)}`, GREEN_LINE);
  vDim(px - 16, py, py + plotH, `Profondeur : ${m(land.depth)}`, GREEN_LINE);

  // Route devant la parcelle, et flèche vers la façade.
  const roadY = py - 10 - roadH;
  page.drawRectangle({ x: M, y: roadY, width: contentW, height: roadH, color: ROAD });
  page.drawLine({ start: { x: M, y: roadY + roadH / 2 }, end: { x: M + contentW, y: roadY + roadH / 2 }, thickness: 1, color: rgb(1, 1, 1), dashArray: [10, 8] });
  centered("ROUTE / VOIE D'ACCÈS", M + 70, roadY + roadH / 2 + 4, 8, bold, GRAY);
  const ax = hx + hw * 0.78;
  page.drawLine({ start: { x: ax, y: roadY + roadH - 4 }, end: { x: ax, y: hy - 4 }, thickness: 1.6, color: DARK });
  arrowHead(ax, hy - 2, "up", DARK, 5);
  centered("Façade principale", ax, roadY + 6, 8.5, bold, DARK);

  // Encadré : surface estimée et avertissement.
  ctx.y = roadY - 22;
  const area = Math.ceil(land.area);
  const lines = [
    [`Terrain minimum estimé : ${m(land.width)} × ${m(land.depth)}, soit environ ${num(area)} m²`, true],
    [`Reculs retenus : ${m(SETBACKS.front)} devant (côté route), ${m(SETBACKS.back)} derrière, ${m(SETBACKS.side)} de chaque côté.`, false],
    ["Il s'agit d'une ESTIMATION indicative du plus petit terrain rectangulaire adapté à ce modèle. Les reculs réels dépendent des règles d'urbanisme de votre commune, de la forme et de la pente de la parcelle et de l'emplacement de la fosse septique. Faites-les vérifier avant d'acheter votre terrain.", false],
  ] as const;
  const wrapped = lines.map(([text, strong]) => ({ strong, rows: wrapText(text, strong ? bold : font, strong ? 11 : 9, contentW - 24) }));
  const h = wrapped.reduce((sum, w) => sum + w.rows.length * (w.strong ? 15 : 12.5) + 6, 18);
  page.drawRectangle({ x: M, y: ctx.y - h + 12, width: contentW, height: h, color: CREAM, borderColor: ORANGE, borderWidth: 0.8 });
  let y = ctx.y - 4;
  for (const w of wrapped) {
    for (const row of w.rows) {
      page.drawText(row, { x: M + 12, y, size: w.strong ? 11 : 9, font: w.strong ? bold : font, color: w.strong ? TEAL : DARK });
      y -= w.strong ? 15 : 12.5;
    }
    y -= 6;
  }
  ctx.y = y - 10;
}

/** Image ajustée dans un cadre (proportions conservées), centrée horizontalement. */
function drawFitted(page: PDFPage, image: PDFImage, x: number, top: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, { x: x + (maxW - w) / 2, y: top - h, width: w, height: h });
  return h;
}

/** Encadré d'avertissement sur la couverture. */
function notice(ctx: Ctx, site: string) {
  const width = A4[0] - 2 * M;
  const text = `Document personnel. Partage sur les réseaux sociaux, revente et usage commercial ou publicitaire interdits. Cet exemplaire est identifié à votre nom : toute diffusion est traçable. Conditions complètes en dernière page. Source officielle : ${site}`;
  const lines = wrapText(text, ctx.font, 8.5, width - 24);
  const h = lines.length * 12 + 26;
  ctx.y -= 6;
  ensure(ctx, h + 6);
  const top = ctx.y + 4;
  ctx.page.drawRectangle({ x: M, y: top - h, width, height: h, color: CREAM, borderColor: ORANGE, borderWidth: 0.8 });
  ctx.page.drawText(pdfSafe("USAGE PERSONNEL UNIQUEMENT"), { x: M + 12, y: top - 15, size: 8.5, font: ctx.bold, color: ORANGE });
  lines.forEach((line, i) => ctx.page.drawText(line, { x: M + 12, y: top - 29 - i * 12, size: 8.5, font: ctx.font, color: DARK }));
  ctx.y = top - h - 12;
}

function termsPage(ctx: Ctx, site: string) {
  const terms = usageTerms(site, ctx.input.licensee);
  newPage(ctx, "Conditions d'utilisation de cette fiche");
  paragraph(ctx, terms.intro);
  ctx.y -= 8;
  ctx.page.drawText(pdfSafe("Vous pouvez"), { x: M, y: ctx.y, size: 11, font: ctx.bold, color: TEAL });
  ctx.y -= 18;
  bullets(ctx, terms.allowed, "+");
  ctx.y -= 8;
  ensure(ctx, 30);
  ctx.page.drawText(pdfSafe("Il est strictement interdit de"), { x: M, y: ctx.y, size: 11, font: ctx.bold, color: ORANGE });
  ctx.y -= 18;
  bullets(ctx, terms.forbidden, "x", ORANGE);
  ctx.y -= 8;
  heading(ctx, "Exemplaire tracé");
  paragraph(ctx, terms.tracing);
  ctx.y -= 10;
  paragraph(ctx, terms.contact, 10, TEAL);
}

async function embed(doc: PDFDocument, image: PdfImage) {
  try {
    return image.type === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
  } catch {
    return null;
  }
}

/**
 * Filigrane visible : lignes diagonales couvrant toute la page, en alternance, dessinées
 * par-dessus le contenu. Chaque ligne est décalée pour ne pas former de colonnes nettes.
 */
export function drawWatermarkGrid(page: PDFPage, lines: string[], font: PDFFont) {
  if (!lines.length) return;
  const { width, height } = page.getSize();
  const size = 10.5;
  const rad = (30 * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const span = Math.hypot(width, height) * 1.4;
  const step = 58;
  const count = Math.ceil(Math.hypot(width, height) / step);
  const texts = lines.map((line) => {
    const unit = `${pdfSafe(line)}        `;
    return unit.repeat(Math.max(1, Math.ceil(span / font.widthOfTextAtSize(unit, size))));
  });
  for (let i = -count; i <= count; i++) {
    // Origine sur la droite perpendiculaire au texte passant par le centre, reculée d'une demi-longueur.
    const cx = width / 2 - i * step * sin;
    const cy = height / 2 + i * step * cos;
    const back = span / 2 + ((i * 137) % 220);
    page.drawText(texts[((i % texts.length) + texts.length) % texts.length], {
      x: cx - back * cos,
      y: cy - back * sin,
      size,
      font,
      color: TEAL,
      opacity: 0.13,
      rotate: degrees(30),
    });
  }
}

/** Zone cliquable ouvrant une adresse web. */
function addLink(doc: PDFDocument, page: PDFPage, url: string, rect: [number, number, number, number]) {
  const annot = doc.context.register(
    doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: rect,
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    }),
  );
  page.node.addAnnot(annot);
}

/** Texte des conditions d'utilisation imprimées dans chaque fiche. */
export function usageTerms(site: string, licensee?: { name: string; id: string }) {
  const who = licensee ? ` à ${licensee.name}` : "";
  return {
    intro: `Cette fiche est un exemplaire personnel délivré${who} dans le cadre du Catalogue Premium WOOPLANS. Les plans, distributions cotées, rendus 3D, devis et textes qu'elle contient sont la propriété de WOOPLANS et sont protégés par le droit d'auteur.`,
    allowed: [
      "La consulter et l'imprimer pour votre propre projet de construction.",
      "La montrer ou l'envoyer en privé à un proche ou à l'entrepreneur que vous consultez pour ce projet.",
    ],
    forbidden: [
      "La publier ou la partager sur les réseaux sociaux (Facebook, WhatsApp Statut, groupes, TikTok, Instagram...), sur un site internet ou une plateforme de partage.",
      "L'utiliser à des fins commerciales ou publicitaires : revente, catalogue, annonces, démarchage de clients, portfolio.",
      "Reproduire, modifier ou présenter ces plans comme votre propre travail.",
      "Retirer, masquer ou modifier les filigranes, les mentions WOOPLANS ou l'identifiant de l'exemplaire.",
    ],
    tracing: `Chaque exemplaire est marqué, sur les pages et dans les images, au nom de son titulaire avec un identifiant unique${licensee ? ` (${licensee.id})` : ""}. Toute copie retrouvée en ligne ou chez un tiers permet d'identifier le compte d'origine. En cas d'usage non autorisé, WOOPLANS peut désactiver l'accès Premium et engager des poursuites.`,
    contact: `Source officielle et plans complets : ${site}`,
  };
}

export async function buildPlanPdf(input: PlanPdfInput): Promise<Uint8Array> {
  const { plan } = input;
  const doc = await PDFDocument.create();
  const date = input.date ?? new Date();
  doc.setTitle(pdfSafe(`${plan.name} — fiche WOOPLANS`));
  doc.setAuthor("WOOPLANS");
  doc.setSubject(pdfSafe(input.footer));
  const site = (input.siteUrl ?? "www.wooplans.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  doc.setKeywords([plan.code, "WOOPLANS", site, ...(input.licensee ? [input.licensee.id] : [])]);
  doc.setCreator(`WOOPLANS - ${site}`);
  doc.setProducer(`WOOPLANS - ${site}`);
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
  notice(ctx, site);

  /* 2. Distributions cotées : une page chacune, la plus grande possible. */
  for (const [i, fp] of (input.floorPlans ?? []).entries()) {
    if (fp.type === "pdf") {
      // Une distribution doit être une image recadrée (dessin seul). Un PDF source complet (couverture, images,
      // ancien devis, ancien habillage) n'est jamais recopié tel quel : seule sa 1re page est posée sur une page
      // WOOPLANS, en attendant son remplacement par une image propre.
      try {
        const source = await PDFDocument.load(fp.bytes, { ignoreEncryption: true });
        const [embedded] = await doc.embedPdf(source, [0]);
        await embedded.embed(); // erreur ici (page vide, PDF abîmé) plutôt qu'à l'enregistrement du document
        newPage(ctx, "Distribution cotée");
        const maxW = contentW;
        const maxH = ctx.y - M - 30;
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
        ctx.page.drawPage(embedded, { x: M + (maxW - embedded.width * scale) / 2, y: ctx.y - embedded.height * scale, xScale: scale, yScale: scale });
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

  /* 2 bis. Terrain minimum estimé (gabarit de la maison dans sa parcelle). */
  if (plan.buildingWidth && plan.buildingDepth) {
    newPage(ctx, "Terrain minimum estimé");
    terrainSketch(ctx, plan.buildingWidth, plan.buildingDepth);
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
    estimateTable(ctx, plan.estimateLots, estimate);
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

  /* 5. Conditions d'utilisation. */
  termsPage(ctx, site);

  /* Pied de page (source cliquable, exemplaire) et filigrane sur toutes les pages. */
  const pages = doc.getPages();
  const source = input.sourceUrl ?? `https://${site}`;
  const sourceLabel = pdfSafe(`Source : ${source.replace(/^https?:\/\//, "")}`);
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    drawWatermarkGrid(page, input.watermarkLines ?? [], bold);
    page.drawRectangle({ x: 0, y: 0, width, height: 58, color: rgb(1, 1, 1), opacity: 0.92 });
    page.drawLine({ start: { x: M, y: 50 }, end: { x: width - M, y: 50 }, thickness: 0.5, color: LINE });
    page.drawRectangle({ x: M, y: 33, width: 3, height: 10, color: ORANGE });
    page.drawText(sourceLabel, { x: M + 9, y: 35, size: 8.5, font: bold, color: TEAL });
    addLink(doc, page, source, [M, 31, M + 9 + bold.widthOfTextAtSize(sourceLabel, 8.5), 45]);
    const right = pdfSafe(`© WOOPLANS · ${i + 1}/${pages.length}`);
    page.drawText(right, { x: width - M - font.widthOfTextAtSize(right, 7.5), y: 35, size: 7.5, font, color: GRAY });
    const fsize = 6.5;
    let footer = pdfSafe(input.footer);
    while (font.widthOfTextAtSize(footer, fsize) > width - 2 * M && footer.length > 20) footer = `${footer.slice(0, -4)}...`;
    page.drawText(footer, { x: M, y: 22, size: fsize, font, color: GRAY });
  });

  return doc.save({ useObjectStreams: true });
}
