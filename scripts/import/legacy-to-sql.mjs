#!/usr/bin/env node
/**
 * Convertit les plans de l'ancienne base D1 (plans-catalogue-db, table « Plan »)
 * vers le nouveau schéma (tables « plans » et « media »).
 *
 * 1. Export :  npx wrangler d1 execute plans-catalogue-db --remote --json \
 *                --command "SELECT * FROM Plan" > scripts/import/legacy-plans.json
 * 2. SQL    :  node scripts/import/legacy-to-sql.mjs scripts/import/legacy-plans.json > scripts/import/legacy-plans.sql
 * 3. Import :  npx wrangler d1 execute DB --remote --file scripts/import/legacy-plans.sql
 *
 * Les images de l'ancien site (« /api/uploads/<clé> ») sont déjà dans le bucket R2 :
 * les rendus deviennent publics (/media/<clé>), les distributions et l'image du devis privées.
 * Idempotent : INSERT OR IGNORE (relancer n'écrase pas les modèles déjà modifiés).
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const RATES = { villa: 160000, duplex: 185000 }; // anciens tarifs au m² (table CostRate)
const LOTS = {
  villa: [
    ["Fondation", 3784200], ["Élévations", 5541150], ["Charpente et toiture", 4189650], ["Crépissage et antivols", 4197600],
    ["Portes et fenêtres", 3148200], ["Plomberie et électricité", 2623500], ["Plafond et peinture", 3672900], ["Carrelage", 3847800],
  ],
  duplex: [
    ["Fondation", 5135700], ["Élévation RDC", 3784200], ["Dalle", 7298100], ["Élévation étage", 4324800], ["Charpente et toiture", 6487200],
    ["Crépissage et antivols", 7632000], ["Portes et fenêtres", 5724000], ["Plomberie et électricité", 4770000],
    ["Plafond et peinture", 6678000], ["Carrelage", 6996000],
  ],
};

const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
// Format wrangler --json : [{ results: [...] }] ; accepte aussi un tableau brut.
const rows = Array.isArray(input) && input[0]?.results ? input[0].results : input;

const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const keyOf = (url) => (url || "").replace(/^\/api\/uploads\//, "").trim();
const parse = (s) => {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const round100k = (v) => Math.round(v / 100000) * 100000;

function estimateLots(category, total) {
  const template = LOTS[category];
  if (!template || !total) return [];
  const base = template.reduce((s, [, a]) => s + a, 0);
  const lots = template.map(([label, a]) => ({ label, amount: Math.round((total * a) / base / 100) * 100 }));
  const diff = total - lots.reduce((s, l) => s + l.amount, 0);
  lots[lots.length - 1].amount += diff;
  return lots;
}

const out = ["-- Généré par scripts/import/legacy-to-sql.mjs", "PRAGMA defer_foreign_keys = true;"];
const media = new Map();

for (const p of rows) {
  const category = p.category === "duplex" ? "duplex" : "villa";
  const code = (p.name.match(/[A-Z]\d-\d{3}/i)?.[0] || p.slug).toUpperCase();
  const renderKeys = parse(p.images).map(keyOf).filter(Boolean);
  const coverKey = keyOf(p.thumbnail) || renderKeys[0] || "";
  const allRenders = [coverKey, ...renderKeys.filter((k) => k !== coverKey)].filter(Boolean);
  const floorKeys = [...parse(p.distributionPlans).map(keyOf), keyOf(p.estimatedCostImage)].filter(Boolean);
  for (const k of allRenders) media.set(k, "public");
  for (const k of floorKeys) media.set(k, "private");

  const surface = Number(p.surface) || 0;
  const total = Number(p.estimatedCost) || (RATES[category] && surface ? Math.round(surface * RATES[category] / 100) * 100 : 0);
  const rooms = parse(p.rooms).map((r) => ({ name: String(r.name), area: Number(r.area) || 0 }));
  const created = Date.parse(p.createdAt) || Date.now();

  const values = {
    id: randomUUID().replace(/-/g, ""),
    slug: p.slug,
    code,
    name: p.name,
    category,
    status: p.published ? "published" : "draft",
    summary: "",
    description: p.description || "",
    bedrooms: Number(p.bedrooms) || 0,
    bathrooms: Number(p.bathrooms) || 0,
    levels: Number(p.floors) || 1,
    surface_total: surface,
    budget_min: total ? round100k(total * 0.9) : null,
    budget_max: total ? round100k(total * 1.1) : null,
    cover_image: coverKey ? `/media/${coverKey}` : "",
    renders: JSON.stringify(allRenders.map((k) => `/media/${k}`)),
    featured: p.featured ? 1 : 0,
    rooms: JSON.stringify(rooms),
    floor_plans: JSON.stringify(floorKeys),
    estimate_total: total || null,
    estimate_lots: JSON.stringify(estimateLots(category, total)),
    cost_assumptions: Number(p.estimatedCost)
      ? "Estimation WooPlans, finitions standard, hors terrain, VRD et honoraires."
      : `Estimation calculée sur ${RATES[category].toLocaleString("fr-FR")} FCFA/m², finitions standard, hors terrain, VRD et honoraires.`,
    published_at: p.published ? created : null,
    created_at: created,
    updated_at: Date.now(),
  };
  const cols = Object.keys(values);
  out.push(`INSERT OR IGNORE INTO plans (${cols.join(", ")}) VALUES (${cols.map((c) => q(values[c])).join(", ")});`);
}

for (const [key, visibility] of media) {
  const type = key.endsWith(".png") ? "image/png" : key.endsWith(".jpg") || key.endsWith(".jpeg") ? "image/jpeg" : "image/webp";
  out.push(`INSERT OR IGNORE INTO media (key, visibility, content_type) VALUES (${q(key)}, ${q(visibility)}, ${q(type)});`);
}

process.stdout.write(out.join("\n") + "\n");
