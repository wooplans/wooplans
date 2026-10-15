/**
 * Validation des fiches créées par un agent (outil MCP create_plan) et des fichiers qu'il téléverse.
 * Module pur (aucune dépendance Cloudflare) : testé dans tests/plan-input.test.ts.
 */

export const PLAN_CATEGORIES = ["villa", "duplex", "immeuble", "autre"] as const;
export type PlanCategoryValue = (typeof PLAN_CATEGORIES)[number];

/** Référence commerciale : « V4-001 », « D4-034 », « IMM-R3-002 ». */
export const PLAN_CODE_PATTERN = /^[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,6}){1,2}$/;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Slug d'une fiche : catégorie + référence, ex. villa + V4-001 → « villa-v4-001 ». */
export function planSlug(category: string, code: string) {
  return slugify(`${category}-${code}`);
}

export type PlanRoomInput = { name: string; area: number; level?: string };
export type EstimateLotInput = { label: string; amount: number };

export type NewPlanValues = {
  code: string;
  slug: string;
  name: string;
  category: PlanCategoryValue;
  status: "draft";
  summary: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
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
  featured: boolean;
  sortOrder: number;
  rooms: PlanRoomInput[];
  estimateTotal: number | null;
  estimateLots: EstimateLotInput[];
  costAssumptions: string;
  strengths: string[];
  watchouts: string[];
  premiumNotes: string;
};

const MAX_FCFA = 100_000_000_000;

type Spec =
  | { kind: "string"; max: number; min?: number }
  | { kind: "int" | "number"; min: number; max: number }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "strings"; maxItems: number; maxLength: number }
  | { kind: "rooms" }
  | { kind: "lots" };

/** Champs acceptés par create_plan (nom MCP → règle). */
export const CREATE_PLAN_FIELDS: Record<string, Spec> = {
  code: { kind: "string", min: 3, max: 20 },
  name: { kind: "string", min: 3, max: 120 },
  category: { kind: "enum", values: PLAN_CATEGORIES },
  summary: { kind: "string", max: 300 },
  description: { kind: "string", max: 10_000 },
  seo_title: { kind: "string", max: 120 },
  seo_description: { kind: "string", max: 320 },
  bedrooms: { kind: "int", min: 0, max: 50 },
  bathrooms: { kind: "int", min: 0, max: 50 },
  levels: { kind: "int", min: 1, max: 30 },
  surface_total: { kind: "int", min: 10, max: 100_000 },
  footprint: { kind: "int", min: 1, max: 100_000 },
  building_width: { kind: "number", min: 1, max: 500 },
  building_depth: { kind: "number", min: 1, max: 500 },
  land_area: { kind: "int", min: 1, max: 1_000_000 },
  land_width: { kind: "number", min: 1, max: 2_000 },
  land_depth: { kind: "number", min: 1, max: 2_000 },
  budget_min: { kind: "int", min: 0, max: MAX_FCFA },
  budget_max: { kind: "int", min: 0, max: MAX_FCFA },
  estimate_total: { kind: "int", min: 0, max: MAX_FCFA },
  rooms: { kind: "rooms" },
  estimate_lots: { kind: "lots" },
  cost_assumptions: { kind: "string", max: 5_000 },
  strengths: { kind: "strings", maxItems: 30, maxLength: 300 },
  watchouts: { kind: "strings", maxItems: 30, maxLength: 300 },
  premium_notes: { kind: "string", max: 10_000 },
  featured: { kind: "boolean" },
  sort_order: { kind: "int", min: -10_000, max: 10_000 },
};

const REQUIRED = ["code", "name", "category", "surface_total"];

export class PlanInputError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Fiche refusée :\n- ${problems.join("\n- ")}`);
    this.problems = problems;
  }
}

const isText = (v: unknown): v is string => typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function checkValue(field: string, spec: Spec, value: unknown, problems: string[]): unknown {
  switch (spec.kind) {
    case "string": {
      if (!isText(value)) return void problems.push(`${field} : texte attendu`);
      const v = value.trim();
      if (v.length < (spec.min ?? 0)) return void problems.push(`${field} : ${spec.min} caractères minimum`);
      if (v.length > spec.max) return void problems.push(`${field} : ${spec.max} caractères maximum (${v.length})`);
      return v;
    }
    case "int":
    case "number": {
      if (!isFiniteNumber(value)) return void problems.push(`${field} : nombre attendu (pas de texte ni d'unité)`);
      if (spec.kind === "int" && !Number.isInteger(value)) return void problems.push(`${field} : nombre entier attendu`);
      if (value < spec.min || value > spec.max) return void problems.push(`${field} : entre ${spec.min} et ${spec.max}`);
      return value;
    }
    case "boolean":
      if (typeof value !== "boolean") return void problems.push(`${field} : true ou false attendu`);
      return value;
    case "enum":
      if (!isText(value) || !spec.values.includes(value)) return void problems.push(`${field} : une valeur parmi ${spec.values.join(", ")}`);
      return value;
    case "strings": {
      if (!Array.isArray(value)) return void problems.push(`${field} : liste de textes attendue`);
      if (value.length > spec.maxItems) return void problems.push(`${field} : ${spec.maxItems} éléments maximum`);
      const out: string[] = [];
      value.forEach((item, i) => {
        if (!isText(item) || !item.trim()) return void problems.push(`${field}[${i}] : texte non vide attendu`);
        if (item.trim().length > spec.maxLength) return void problems.push(`${field}[${i}] : ${spec.maxLength} caractères maximum`);
        out.push(item.trim());
      });
      return out;
    }
    case "rooms": {
      if (!Array.isArray(value)) return void problems.push(`${field} : liste de { name, area, level? } attendue`);
      if (value.length > 150) return void problems.push(`${field} : 150 pièces maximum`);
      const out: PlanRoomInput[] = [];
      value.forEach((item, i) => {
        const r = item as Record<string, unknown> | null;
        if (!r || typeof r !== "object" || Array.isArray(r)) return void problems.push(`${field}[${i}] : objet { name, area, level? } attendu`);
        const extra = Object.keys(r).filter((k) => !["name", "area", "level"].includes(k));
        if (extra.length) problems.push(`${field}[${i}] : champ(s) inconnu(s) ${extra.join(", ")}`);
        if (!isText(r.name) || !r.name.trim() || r.name.trim().length > 80) problems.push(`${field}[${i}].name : texte de 1 à 80 caractères`);
        if (!isFiniteNumber(r.area) || r.area <= 0 || r.area > 10_000) problems.push(`${field}[${i}].area : surface en m² (0 à 10 000)`);
        if (r.level !== undefined && (!isText(r.level) || !r.level.trim() || r.level.trim().length > 40)) problems.push(`${field}[${i}].level : texte de 1 à 40 caractères (ex. « RDC », « R+1 »)`);
        if (isText(r.name) && isFiniteNumber(r.area)) {
          out.push({ name: r.name.trim(), area: Math.round(r.area * 100) / 100, ...(isText(r.level) && r.level.trim() ? { level: r.level.trim() } : {}) });
        }
      });
      return out;
    }
    case "lots": {
      if (!Array.isArray(value)) return void problems.push(`${field} : liste de { label, amount } attendue`);
      if (value.length > 80) return void problems.push(`${field} : 80 lots maximum`);
      const out: EstimateLotInput[] = [];
      value.forEach((item, i) => {
        const l = item as Record<string, unknown> | null;
        if (!l || typeof l !== "object" || Array.isArray(l)) return void problems.push(`${field}[${i}] : objet { label, amount } attendu`);
        const extra = Object.keys(l).filter((k) => !["label", "amount"].includes(k));
        if (extra.length) problems.push(`${field}[${i}] : champ(s) inconnu(s) ${extra.join(", ")}`);
        if (!isText(l.label) || !l.label.trim() || l.label.trim().length > 120) problems.push(`${field}[${i}].label : texte de 1 à 120 caractères`);
        if (!isFiniteNumber(l.amount) || !Number.isInteger(l.amount) || l.amount < 0 || l.amount > MAX_FCFA) problems.push(`${field}[${i}].amount : montant entier en FCFA`);
        if (isText(l.label) && isFiniteNumber(l.amount)) out.push({ label: l.label.trim(), amount: l.amount });
      });
      return out;
    }
  }
}

/**
 * Valide strictement les arguments de create_plan (types, bornes, champs inconnus) et
 * renvoie les valeurs prêtes pour l'insertion, toujours en brouillon. Lève PlanInputError
 * avec la liste complète des problèmes.
 */
export function parseCreatePlanInput(args: Record<string, unknown>): { values: NewPlanValues; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const v: Record<string, unknown> = {};

  for (const key of Object.keys(args)) {
    if (key === "status") problems.push("status : une fiche créée par l'agent est toujours un brouillon (publier ensuite avec update_plan_content, après accord du propriétaire)");
    else if (key === "slug") problems.push("slug : généré automatiquement (catégorie + référence)");
    else if (!(key in CREATE_PLAN_FIELDS)) problems.push(`${key} : champ inconnu`);
  }
  for (const field of REQUIRED) if (args[field] === undefined || args[field] === null) problems.push(`${field} : obligatoire`);
  for (const [field, spec] of Object.entries(CREATE_PLAN_FIELDS)) {
    if (args[field] === undefined || args[field] === null) continue;
    const checked = checkValue(field, spec, args[field], problems);
    if (checked !== undefined) v[field] = checked;
  }

  const code = isText(v.code) ? v.code.toUpperCase() : "";
  if (code && !PLAN_CODE_PATTERN.test(code)) problems.push(`code : format attendu « V4-001 » (lettres/chiffres séparés par des tirets), reçu « ${code} »`);
  const num = (k: string) => (isFiniteNumber(v[k]) ? (v[k] as number) : null);
  if (num("budget_min") !== null && num("budget_max") !== null && num("budget_min")! > num("budget_max")!) problems.push("budget_min : doit être inférieur ou égal à budget_max");
  if (num("footprint") !== null && num("surface_total") !== null && num("footprint")! > num("surface_total")! * 1.5 && (num("levels") ?? 1) > 1)
    warnings.push("Emprise au sol supérieure à 1,5 × la surface totale pour un bâtiment à étages : à vérifier.");
  if (num("land_area") !== null && num("footprint") !== null && num("footprint")! > num("land_area")!) problems.push("footprint : l'emprise au sol dépasse la surface du terrain");

  if (problems.length) throw new PlanInputError(problems);

  const lots = (v.estimate_lots as EstimateLotInput[] | undefined) ?? [];
  const lotsTotal = lots.reduce((sum, l) => sum + l.amount, 0);
  const estimateTotal = num("estimate_total") ?? (lotsTotal || null);
  if (num("estimate_total") !== null && lots.length && lotsTotal !== num("estimate_total"))
    warnings.push(`Somme des lots (${lotsTotal} FCFA) différente du total du devis (${num("estimate_total")} FCFA).`);
  const rooms = (v.rooms as PlanRoomInput[] | undefined) ?? [];
  const roomsArea = rooms.reduce((sum, r) => sum + r.area, 0);
  if (rooms.length && roomsArea > num("surface_total")! * 1.25)
    warnings.push(`Somme des surfaces des pièces (${Math.round(roomsArea)} m²) nettement supérieure à la surface totale.`);
  // Même règle que l'admin : budget indicatif = devis ± 10 %, arrondi à 100 000 FCFA.
  const around = (factor: number) => (estimateTotal ? Math.round((estimateTotal * factor) / 100_000) * 100_000 : null);

  const category = v.category as PlanCategoryValue;
  return {
    values: {
      code,
      slug: planSlug(category, code),
      name: v.name as string,
      category,
      status: "draft",
      summary: (v.summary as string | undefined) ?? "",
      description: (v.description as string | undefined) ?? "",
      seoTitle: (v.seo_title as string | undefined) || null,
      seoDescription: (v.seo_description as string | undefined) || null,
      bedrooms: num("bedrooms") ?? 0,
      bathrooms: num("bathrooms") ?? 0,
      levels: num("levels") ?? 1,
      surfaceTotal: num("surface_total")!,
      footprint: num("footprint"),
      buildingWidth: num("building_width"),
      buildingDepth: num("building_depth"),
      landArea: num("land_area"),
      landWidth: num("land_width"),
      landDepth: num("land_depth"),
      budgetMin: num("budget_min") ?? around(0.9),
      budgetMax: num("budget_max") ?? around(1.1),
      featured: (v.featured as boolean | undefined) ?? false,
      sortOrder: num("sort_order") ?? 0,
      rooms,
      estimateTotal,
      estimateLots: lots,
      costAssumptions: (v.cost_assumptions as string | undefined) ?? "",
      strengths: (v.strengths as string[] | undefined) ?? [],
      watchouts: (v.watchouts as string[] | undefined) ?? [],
      premiumNotes: (v.premium_notes as string | undefined) ?? "",
    },
    warnings,
  };
}

/* ─────────────────────────── Fichiers ─────────────────────────── */

export const PLAN_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export type ImageRole = "render" | "floor_plan";
export type SniffedType = { contentType: string; ext: string };

/** Type réel d'un fichier d'après ses premiers octets (png, jpeg, webp, pdf). */
export function sniffFileType(head: Uint8Array): SniffedType | null {
  const at = (i: number, bytes: number[]) => bytes.every((b, j) => head[i + j] === b);
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png", ext: "png" };
  if (at(0, [0xff, 0xd8, 0xff])) return { contentType: "image/jpeg", ext: "jpg" };
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return { contentType: "image/webp", ext: "webp" };
  if (at(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { contentType: "application/pdf", ext: "pdf" };
  return null;
}

/** Type accepté pour un rôle : images pour les rendus, images ou PDF pour les distributions. */
export function acceptedForRole(type: SniffedType | null, role: ImageRole): type is SniffedType {
  if (!type) return false;
  return type.contentType.startsWith("image/") || (role === "floor_plan" && type.contentType === "application/pdf");
}

/** Décode un contenu base64 (préfixe « data:…;base64, » accepté) en refusant ce qui dépasse la limite. */
export function decodeBase64File(input: string, maxBytes = PLAN_IMAGE_MAX_BYTES): Uint8Array {
  const raw = input.replace(/^data:[^,]*;base64,/i, "").replace(/\s+/g, "");
  if (!raw) throw new Error("Contenu base64 vide");
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) throw new Error("Contenu base64 invalide");
  const padding = raw.endsWith("==") ? 2 : raw.endsWith("=") ? 1 : 0;
  const size = Math.floor((raw.length * 3) / 4) - padding;
  if (size > maxBytes) throw new Error(`Fichier trop lourd : ${(size / 1048576).toFixed(1)} Mo (max ${maxBytes / 1048576} Mo)`);
  const binary = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** URL de téléchargement acceptée : https uniquement, pas d'adresse locale ou privée, pas d'identifiants. */
export function checkDownloadUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL invalide");
  }
  if (url.protocol !== "https:") throw new Error("Seules les URL https sont acceptées");
  if (url.username || url.password) throw new Error("URL avec identifiants refusée");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    /^(127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host);
  if (privateHost) throw new Error("Adresse locale ou privée refusée");
  return url;
}

/** Nouvel ordre d'une liste : doit être une permutation exacte des éléments actuels. */
export function reorderList(current: string[], order: string[]): string[] {
  const sameSize = order.length === current.length && new Set(order).size === order.length;
  if (!sameSize || !order.every((item) => current.includes(item))) {
    throw new Error(`L'ordre doit reprendre exactement les ${current.length} élément(s) actuel(s), chacun une fois : ${JSON.stringify(current)}`);
  }
  return order;
}
