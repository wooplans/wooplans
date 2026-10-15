#!/usr/bin/env node
/**
 * Import des modèles du CMS Framer absents de D1 (scripts/framer/plans.json, extrait par inventory.mjs).
 * Copie les images dans R2 (bucket MEDIA) puis crée les fiches en BROUILLON (à relire et publier
 * dans Admin → Modèles). Idempotent : clés R2 déterministes, INSERT OR IGNORE sur le slug.
 * Usage (CI) : node scripts/framer/import.mjs   (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID requis)
 */
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUCKET = "plans-catalogue-images";
const plans = JSON.parse(readFileSync(new URL("./plans.json", import.meta.url), "utf8"));
const dir = mkdtempSync(join(tmpdir(), "framer-"));
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const types = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const fcfa = (n) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

const sql = [];
for (const plan of plans) {
  const keys = [];
  for (const url of plan.images) {
    const ext = url.split(".").pop().toLowerCase();
    const key = `upload-framer-${createHash("sha1").update(url).digest("hex").slice(0, 20)}.${ext}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  image ignorée (${res.status}) : ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(dir, key);
    writeFileSync(file, buf);
    execFileSync("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", types[ext] || "application/octet-stream", "--remote"], { stdio: "ignore" });
    sql.push(`INSERT OR IGNORE INTO media (key, visibility, content_type, size, label) VALUES (${q(key)}, 'public', ${q(types[ext])}, ${buf.length}, ${q(`${plan.code} (Framer)`)});`);
    keys.push(`/media/${key}`);
  }
  let description = plan.description;
  if (plan.grosOeuvre) description += `\n\nGros œuvre : à partir de ${fcfa(plan.grosOeuvre)} FCFA (estimation indicative).`;
  sql.push(
    `INSERT OR IGNORE INTO plans (id, slug, code, name, category, status, summary, description, seo_title, seo_description, bedrooms, bathrooms, levels, surface_total, building_width, building_depth, cover_image, renders) VALUES (` +
      [randomUUID().replace(/-/g, ""), plan.slug, plan.code, plan.name, plan.category, "draft", plan.summary, description, plan.seoTitle, plan.seoDescription, plan.bedrooms, plan.bathrooms, plan.levels, plan.surfaceTotal, plan.buildingWidth, plan.buildingDepth, keys[0] || "", JSON.stringify(keys)]
        .map(q)
        .join(", ") +
      `);`,
  );
  console.log(`${plan.slug} : ${keys.length} images`);
}

const sqlFile = join(dir, "import.sql");
writeFileSync(sqlFile, sql.join("\n") + "\n");
execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--remote", "--file", sqlFile], { stdio: "inherit" });
console.log(`${plans.length} modèles traités (brouillons).`);
