import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PlanInputError,
  acceptedForRole,
  checkDownloadUrl,
  decodeBase64File,
  parseCreatePlanInput,
  planSlug,
  reorderList,
  slugify,
  sniffFileType,
} from "../src/lib/plan-input.ts";

const base = { code: "v4-101", name: "Villa V4-101", category: "villa", surface_total: 180 };

const problems = (args: Record<string, unknown>) => {
  try {
    parseCreatePlanInput(args);
  } catch (error) {
    assert.ok(error instanceof PlanInputError);
    return error.problems.join("\n");
  }
  assert.fail("la validation aurait dû échouer");
};

test("slug : catégorie + référence, comme les modèles importés de Framer", () => {
  assert.equal(planSlug("villa", "V4-001"), "villa-v4-001");
  assert.equal(planSlug("duplex", "D5-002"), "duplex-d5-002");
  assert.equal(slugify("  Été — Résidence  N°3 "), "ete-residence-n-3");
});

test("fiche minimale : brouillon, référence en majuscules, valeurs par défaut", () => {
  const { values, warnings } = parseCreatePlanInput(base);
  assert.equal(values.code, "V4-101");
  assert.equal(values.slug, "villa-v4-101");
  assert.equal(values.status, "draft");
  assert.equal(values.levels, 1);
  assert.equal(values.bedrooms, 0);
  assert.deepEqual(values.rooms, []);
  assert.equal(values.budgetMin, null);
  assert.deepEqual(warnings, []);
});

test("fiche complète : pièces, devis par lots, budget déduit du devis (± 10 %)", () => {
  const { values } = parseCreatePlanInput({
    ...base,
    bedrooms: 4,
    bathrooms: 3,
    levels: 1,
    footprint: 190,
    building_width: 15.5,
    building_depth: 12.2,
    land_area: 400,
    land_width: 20,
    land_depth: 20,
    rooms: [{ name: " Séjour ", area: 32.5, level: "RDC" }, { name: "Chambre 1", area: 14 }],
    estimate_lots: [{ label: "Fondation", amount: 3_784_200 }, { label: "Gros œuvre", amount: 16_215_800 }],
    strengths: ["Plain-pied", " Grande terrasse "],
    watchouts: ["Terrain de 20 m de façade minimum"],
    premium_notes: "Notes",
  });
  assert.deepEqual(values.rooms, [{ name: "Séjour", area: 32.5, level: "RDC" }, { name: "Chambre 1", area: 14 }]);
  assert.equal(values.estimateTotal, 20_000_000);
  assert.equal(values.budgetMin, 18_000_000);
  assert.equal(values.budgetMax, 22_000_000);
  assert.deepEqual(values.strengths, ["Plain-pied", "Grande terrasse"]);
  assert.equal(values.buildingWidth, 15.5);
});

test("champs obligatoires et champs inconnus", () => {
  const p = problems({ name: "X", foo: 1 });
  assert.match(p, /code : obligatoire/);
  assert.match(p, /category : obligatoire/);
  assert.match(p, /surface_total : obligatoire/);
  assert.match(p, /foo : champ inconnu/);
  assert.match(p, /name : 3 caractères minimum/);
});

test("statut et slug imposés : jamais de publication directe", () => {
  assert.match(problems({ ...base, status: "published" }), /toujours un brouillon/);
  assert.match(problems({ ...base, slug: "autre" }), /généré automatiquement/);
});

test("types stricts : pas de nombre en texte, entiers là où il faut", () => {
  assert.match(problems({ ...base, surface_total: "180" }), /surface_total : nombre attendu/);
  assert.match(problems({ ...base, bedrooms: 3.5 }), /bedrooms : nombre entier attendu/);
  assert.match(problems({ ...base, budget_min: 25_000_000.5 }), /budget_min : nombre entier attendu/);
  assert.match(problems({ ...base, featured: "oui" }), /featured : true ou false/);
  assert.match(problems({ ...base, category: "chateau" }), /category : une valeur parmi/);
  assert.match(problems({ ...base, strengths: "Plain-pied" }), /strengths : liste de textes/);
  assert.match(problems({ ...base, surface_total: Number.NaN }), /surface_total : nombre attendu/);
});

test("bornes et cohérence", () => {
  assert.match(problems({ ...base, levels: 0 }), /levels : entre 1 et 30/);
  assert.match(problems({ ...base, surface_total: 5 }), /surface_total : entre 10/);
  assert.match(problems({ ...base, budget_min: 30_000_000, budget_max: 20_000_000 }), /budget_min : doit être inférieur/);
  assert.match(problems({ ...base, footprint: 500, land_area: 300 }), /emprise au sol dépasse/);
  assert.match(problems({ ...base, code: "V4 101" }), /code : format attendu/);
  assert.match(problems({ ...base, summary: "x".repeat(301) }), /summary : 300 caractères maximum/);
});

test("pièces et lots mal formés", () => {
  const p = problems({ ...base, rooms: [{ name: "", area: -2 }, { name: "Salon", area: 20, surface: 3 }], estimate_lots: [{ label: "Toiture", amount: "1 000 000" }] });
  assert.match(p, /rooms\[0\]\.name/);
  assert.match(p, /rooms\[0\]\.area/);
  assert.match(p, /rooms\[1\] : champ\(s\) inconnu\(s\) surface/);
  assert.match(p, /estimate_lots\[0\]\.amount : montant entier/);
});

test("avertissements : total du devis différent de la somme des lots", () => {
  const { values, warnings } = parseCreatePlanInput({ ...base, estimate_total: 21_000_000, estimate_lots: [{ label: "Tout", amount: 20_000_000 }] });
  assert.equal(values.estimateTotal, 21_000_000);
  assert.equal(warnings.length, 1);
});

test("type réel des fichiers (octets de tête)", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
  const pdf = new TextEncoder().encode("%PDF-1.7\n");
  const html = new TextEncoder().encode("<!doctype html>");
  assert.equal(sniffFileType(png)?.contentType, "image/png");
  assert.equal(sniffFileType(jpeg)?.ext, "jpg");
  assert.equal(sniffFileType(webp)?.contentType, "image/webp");
  assert.equal(sniffFileType(pdf)?.contentType, "application/pdf");
  assert.equal(sniffFileType(html), null);
  assert.equal(acceptedForRole(sniffFileType(pdf), "render"), false);
  assert.equal(acceptedForRole(sniffFileType(pdf), "floor_plan"), true);
  assert.equal(acceptedForRole(sniffFileType(webp), "render"), true);
  assert.equal(acceptedForRole(null, "floor_plan"), false);
});

test("base64 : préfixe data:, contenu invalide, limite de taille", () => {
  const bytes = decodeBase64File(`data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64")}`);
  assert.deepEqual([...bytes], [0x89, 0x50, 0x4e, 0x47]);
  assert.throws(() => decodeBase64File("pas du base64 !"), /base64 invalide/);
  assert.throws(() => decodeBase64File(""), /vide/);
  assert.throws(() => decodeBase64File(Buffer.alloc(2048).toString("base64"), 1024), /trop lourd/);
});

test("URL de téléchargement : https public uniquement", () => {
  assert.equal(checkDownloadUrl("https://example.com/rendu.jpg").hostname, "example.com");
  assert.throws(() => checkDownloadUrl("http://example.com/a.jpg"), /https/);
  assert.throws(() => checkDownloadUrl("https://localhost/a.jpg"), /privée/);
  assert.throws(() => checkDownloadUrl("https://192.168.1.2/a.jpg"), /privée/);
  assert.throws(() => checkDownloadUrl("https://[::1]/a.jpg"), /privée/);
  assert.throws(() => checkDownloadUrl("https://user:pass@example.com/a.jpg"), /identifiants/);
  assert.throws(() => checkDownloadUrl("pas une url"), /URL invalide/);
});

test("réordonnancement : permutation exacte exigée", () => {
  assert.deepEqual(reorderList(["a", "b", "c"], ["c", "a", "b"]), ["c", "a", "b"]);
  assert.throws(() => reorderList(["a", "b"], ["a"]), /exactement/);
  assert.throws(() => reorderList(["a", "b"], ["a", "a"]), /exactement/);
  assert.throws(() => reorderList(["a", "b"], ["a", "z"]), /exactement/);
});

test("jeton du lien d'envoi : signature, expiration, falsification", async () => {
  const { signUploadToken, verifyUploadToken } = await import("../src/lib/plan-input.ts");
  const secret = "secret-de-test-assez-long";
  const now = 1_700_000_000_000;
  const token = await signUploadToken(secret, { planId: "abc", code: "V4-101", expiresAt: now + 3600_000 });
  assert.deepEqual(await verifyUploadToken(secret, token, now), { planId: "abc", code: "V4-101", expiresAt: now + 3600_000 });
  assert.equal(await verifyUploadToken(secret, token, now + 3600_001), null, "expiré");
  assert.equal(await verifyUploadToken("autre-secret-assez-long", token, now), null, "mauvais secret");
  const [body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ p: "autre", c: "V4-101", e: now + 3600_000 })).toString("base64url");
  assert.equal(await verifyUploadToken(secret, `${forged}.${sig}`, now), null, "contenu modifié");
  assert.equal(await verifyUploadToken(secret, `${body}.${sig}x`, now), null, "signature modifiée");
  assert.equal(await verifyUploadToken(secret, "n'importe quoi", now), null);
  await assert.rejects(() => signUploadToken("", { planId: "a", code: "b", expiresAt: now }), /Secret/);
});

test("jeton de lecture d'un fichier Premium : lié à une clé, expire, distinct du lien d'envoi", async () => {
  const { signFileToken, verifyFileToken, signUploadToken, verifyUploadToken } = await import("../src/lib/plan-input.ts");
  const secret = "secret-de-test-assez-long";
  const now = 1_700_000_000_000;
  const key = "private/v4-101/1700000000000-abc123.pdf";
  const token = await signFileToken(secret, { key, expiresAt: now + 1800_000 });
  assert.deepEqual(await verifyFileToken(secret, token, key, now), { key, expiresAt: now + 1800_000 });
  assert.equal(await verifyFileToken(secret, token, "private/v4-101/autre.pdf", now), null, "autre fichier");
  assert.equal(await verifyFileToken(secret, token, key, now + 1800_001), null, "expiré");
  assert.equal(await verifyFileToken("autre-secret-assez-long", token, key, now), null, "mauvais secret");
  assert.equal(await verifyUploadToken(secret, token, now), null, "pas un jeton d'envoi");
  const upload = await signUploadToken(secret, { planId: "abc", code: "V4-101", expiresAt: now + 3600_000 });
  assert.equal(await verifyFileToken(secret, upload, key, now), null, "pas un jeton de lecture");
});

test("parsePremiumUpdate : champs fournis seulement, total = somme des lots", async () => {
  const { parsePremiumUpdate } = await import("../src/lib/plan-input.ts");
  const { values, warnings } = parsePremiumUpdate({
    code: "V4-001",
    bedrooms: 4,
    rooms: [{ name: " Séjour ", area: 30.456, level: "RDC" }],
    estimate_lots: [{ label: "Fondation", amount: 4_000_000 }, { label: "Élévations", amount: 6_000_000 }],
  });
  assert.equal(values.bedrooms, 4);
  assert.deepEqual(values.rooms, [{ name: "Séjour", area: 30.46, level: "RDC" }]);
  assert.equal(values.estimateTotal, 10_000_000);
  assert.equal(values.surfaceTotal, undefined);
  assert.deepEqual(warnings, []);
  const mismatch = parsePremiumUpdate({ estimate_lots: [{ label: "A", amount: 1 }], estimate_total: 5 });
  assert.equal(mismatch.values.estimateTotal, 5);
  assert.equal(mismatch.warnings.length, 1);
  assert.throws(() => parsePremiumUpdate({ estimate_lots: [{ label: "A", amount: "2 M" }] }), PlanInputError);
  assert.throws(() => parsePremiumUpdate({ surface_total: 5 }), PlanInputError);
});
