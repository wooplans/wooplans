/**
 * Filigrane incrusté dans les pixels des images (rendus, distributions cotées).
 *
 * Le filigrane texte du PDF se retire avec n'importe quel éditeur ; celui-ci fait partie
 * de l'image : une image extraite du PDF (ou enregistrée depuis l'espace Premium) le garde.
 * Module pur, sans dépendance : il produit un calque PNG transparent (texte en diagonale,
 * lettres blanches cernées de sombre, lisibles sur un ciel comme sur un plan blanc) que le
 * binding Cloudflare Images fusionne ensuite avec l'image.
 */

/* Police matricielle 5 × 7 (majuscules, chiffres, ponctuation courante). */
const GLYPHS: Record<string, string[]> = {
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ### ", "#   #", "#    ", "# ###", "#   #", "#   #", " ####"],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: [" ### ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  J: ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "#   #", "##  #", "# # #", "#  ##", "#   #", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "# # #", " # # "],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#####", "   # ", "  #  ", "   # ", "    #", "#   #", " ### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": ["  ## ", " #   ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "   # ", " ##  "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ",": ["     ", "     ", "     ", "     ", "     ", "  ## ", "  #  "],
  "@": [" ### ", "#   #", "# ###", "# # #", "# ###", "#    ", " ####"],
  "-": ["     ", "     ", "     ", " ### ", "     ", "     ", "     "],
  _: ["     ", "     ", "     ", "     ", "     ", "     ", "#####"],
  "·": ["     ", "     ", "     ", "  #  ", "     ", "     ", "     "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  "'": ["  #  ", "  #  ", " #   ", "     ", "     ", "     ", "     "],
  "/": ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
  "(": ["   # ", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   # "],
  ")": [" #   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", " #   "],
  "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
  "&": [" ##  ", "#  # ", "# #  ", " #   ", "# # #", "#  # ", " ## #"],
};

/** Texte ramené à l'alphabet de la police : majuscules sans accents, autres signes remplacés. */
export function rasterText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/©/g, "(C)")
    .replace(/./gu, (c) => (GLYPHS[c] ? c : c.trim() ? "?" : " "));
}

/** Glyphes en tableaux de bits (ligne par ligne), précalculés une fois. */
const BITS = new Map(Object.entries(GLYPHS).map(([c, rows]) => [c, rows.map((r) => [...r].map((p) => p === "#"))]));

export type OverlayOptions = {
  /** Lignes répétées en diagonale, en alternance. */
  lines: string[];
  /** Taille d'un « pixel » de police dans le calque. */
  cell?: number;
  /** Écart entre deux lignes de texte (perpendiculairement au texte). */
  spacing?: number;
  /** Angle du texte en degrés (montant de gauche à droite). */
  angle?: number;
  /** Opacité des lettres (blanc) et de leur contour (sombre), de 0 à 255. */
  fillAlpha?: number;
  haloAlpha?: number;
};

/**
 * Calque RGBA (largeur × hauteur) couvert de texte en diagonale.
 * Échantillonnage 2 × 2 par pixel pour adoucir les bords, puis contour d'un pixel.
 */
export function renderOverlay(width: number, height: number, opts: OverlayOptions) {
  const cell = opts.cell ?? 3;
  const spacing = opts.spacing ?? cell * 30;
  const angle = ((opts.angle ?? 30) * Math.PI) / 180;
  const fillAlpha = opts.fillAlpha ?? 120;
  const haloAlpha = opts.haloAlpha ?? 70;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const glyphW = cell * 6;
  const glyphH = cell * 7;
  const texts = opts.lines.map((line) => {
    const chars = [...`${rasterText(line)}    `].map((c) => BITS.get(c)!);
    return { chars, period: chars.length * glyphW };
  });

  const ink = (x: number, y: number) => {
    const u = x * cos - y * sin;
    const v = x * sin + y * cos;
    const lineIndex = Math.floor(v / spacing);
    const dy = v - lineIndex * spacing;
    if (dy >= glyphH) return 0;
    const n = ((lineIndex % texts.length) + texts.length) % texts.length;
    const text = texts[n];
    // Décalage d'une ligne à l'autre : le texte ne s'aligne pas en colonnes faciles à effacer.
    const shifted = u + lineIndex * glyphW * 7.5;
    const pos = ((shifted % text.period) + text.period) % text.period;
    const glyph = text.chars[Math.floor(pos / glyphW)];
    const col = Math.floor((pos % glyphW) / cell);
    return col < 5 && glyph[Math.floor(dy / cell)][col] ? 1 : 0;
  };

  const coverage = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      coverage[y * width + x] = ink(x + 0.25, y + 0.25) + ink(x + 0.75, y + 0.25) + ink(x + 0.25, y + 0.75) + ink(x + 0.75, y + 0.75);
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = coverage[i];
      let halo = 0;
      for (let dy = -1; dy <= 1 && halo < 4; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < width && coverage[yy * width + xx] > halo) halo = coverage[yy * width + xx];
        }
      }
      if (!c && !halo) continue;
      const fill = c / 4;
      const o = i * 4;
      // Lettre blanche posée sur un contour sombre : visible sur toutes les teintes.
      const shade = Math.round(255 * fill + 20 * (1 - fill));
      rgba[o] = shade;
      rgba[o + 1] = shade;
      rgba[o + 2] = shade;
      rgba[o + 3] = Math.round(Math.max(fillAlpha * fill, (haloAlpha * halo) / 4));
    }
  }
  return rgba;
}

/* ─────────────── Encodage PNG minimal (RGBA 8 bits, compression zlib native) ─────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function deflate(bytes: Uint8Array) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodePng(rgba: Uint8Array, width: number, height: number) {
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre « aucun »
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Dimensions d'un JPEG (segment SOF) ou d'un PNG (IHDR), sans le décoder. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = view.getUint16(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
    i += 2 + length;
  }
  return null;
}

/** Largeur du calque : l'image finale est 1,5 à 2,5 fois plus large, le calque y est agrandi. */
export const OVERLAY_WIDTH = 900;

/**
 * Intensité du calque : « photo » pour les rendus 3D, « plan » plus léger pour les
 * distributions cotées, dont les cotes doivent rester lisibles une fois imprimées.
 */
export type OverlayStrength = "photo" | "plan";

const STRENGTH: Record<OverlayStrength, { fillAlpha: number; haloAlpha: number }> = {
  photo: { fillAlpha: 105, haloAlpha: 60 },
  plan: { fillAlpha: 90, haloAlpha: 42 },
};

/** Calque PNG aux proportions de l'image, prêt à être agrandi à sa taille. */
export async function watermarkOverlayPng(imageWidth: number, imageHeight: number, lines: string[], strength: OverlayStrength = "photo") {
  const width = Math.min(OVERLAY_WIDTH, imageWidth);
  const height = Math.max(1, Math.round((imageHeight * width) / imageWidth));
  const cell = width >= 700 ? 3 : 2;
  const rgba = renderOverlay(width, height, { lines, cell, spacing: cell * 50, ...STRENGTH[strength] });
  return { png: await encodePng(rgba, width, height), width, height };
}
