#!/usr/bin/env node
/**
 * Tests de fumée en production (lancés par la CI après le déploiement).
 * Aucun email n'est envoyé : le webhook est testé sans x-pulse-delivery-id (événement de test),
 * le cron n'est appelé qu'avec un mauvais secret.
 *
 * Variables : BASE_URL, MCP_TOKEN, CHARIOW_PULSE_SECRET, CRON_SECRET,
 * SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD, SMOKE_MEMBER_EMAIL / SMOKE_MEMBER_CODE,
 * SMOKE_MEDIA (fichier JSON : [{ key, visibility }]).
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const base = process.env.BASE_URL.replace(/\/$/, "");
const env = process.env;
let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};
let transient = 0;
// Une seule nouvelle tentative après 2 s sur 503 (limite passagère de Cloudflare), comptée dans le résumé.
const get = async (path, init = {}) => {
  const res = await fetch(base + path, { redirect: "manual", ...init });
  if (res.status !== 503) return res;
  transient++;
  await new Promise((r) => setTimeout(r, 2000));
  return fetch(base + path, { redirect: "manual", ...init });
};
const cookieOf = (res) => (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");

// Vitrine et fiches
for (const path of ["/", "/catalogue", "/catalogue-villa", "/catalogue-duplex", "/plans-personnalises", "/a-propos", "/contact", "/connexion", "/sitemap.xml", "/robots.txt"]) {
  const res = await get(path);
  ok(`GET ${path}`, res.status === 200, String(res.status));
}
const plansHtml = await (await get("/catalogue")).text();
const slugs = [...new Set([...plansHtml.matchAll(/href="\/catalogue\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
ok("fiches listées sur /catalogue", slugs.length > 0, `${slugs.length}`);
for (const slug of slugs) {
  const res = await get(`/catalogue/${slug}`);
  ok(`GET /catalogue/${slug}`, res.status === 200, String(res.status));
}
const redirects = {
  "/modeles": "/catalogue",
  "/plans": "/catalogue",
  "/plans/villa-v3-018": "/catalogue/villa-v3-018",
  "/premium-wooplans": "/catalogue-premium",
  "/contacter-nous": "/contact",
  "/achat-cp": "/merci",
  "/arnaques-foncieres": "https://wooplans.mychariow.shop/prd_bri6ow",
  "/conditions-g%C3%A9n%C3%A9rales-de-vente": "/conditions-generales-de-vente",
  "/mention-l%C3%A9gales": "/mentions-legales",
  "/politique-de-confidentialit%C3%A9": "/confidentialite",
};
for (const [from, to] of Object.entries(redirects)) {
  const res = await get(from);
  const location = res.headers.get("location") || "";
  ok(`redirection ${from} → ${to}`, [301, 308].includes(res.status) && location.replace(base, "").endsWith(to), `${res.status} ${location}`);
}

// Page de vente
const sales = await get("/catalogue-premium");
const salesHtml = await sales.text();
ok("GET /catalogue-premium", sales.status === 200, String(sales.status));
// A : widget Snap Chariow ; B : formulaire court du site (paiement ouvert par /api/checkout).
if (sales.headers.get("x-page-variant") === "a") {
  ok("widget Chariow présent", salesHtml.includes("chariow-widget"));
  ok("produit Snap prd_9cbatg présent", salesHtml.includes("prd_9cbatg"));
} else {
  ok("formulaire de paiement court présent", salesHtml.includes("/api/checkout"));
}
ok("Pixel Meta présent", salesHtml.includes("1025626273769966") || (await (await get("/")).text()).includes("1025626273769966"));
const bShare = Number(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").match(/"SALES_PAGE_B_SHARE"\s*:\s*"(\d+)"/)?.[1] ?? 0);
const expectedVariant = bShare >= 100 ? "b" : bShare <= 0 ? "a" : null;
ok(`page de vente : variante servie (part B ${bShare} %)`, expectedVariant ? sales.headers.get("x-page-variant") === expectedVariant : ["a", "b"].includes(sales.headers.get("x-page-variant") || ""), sales.headers.get("x-page-variant") || "absent");
ok("page de vente : WhatsApp du support 237694327885", salesHtml.includes("237694327885") && !salesHtml.includes("237653769998"));
const salesB = await get("/catalogue-premium?variante=b");
const salesBHtml = await salesB.text();
ok("page de vente B : aperçu ?variante=b", salesB.status === 200 && salesB.headers.get("x-page-variant") === "b", `${salesB.status} ${salesB.headers.get("x-page-variant")}`);
ok("page de vente B : cookie d'aperçu posé", /wp_lp=b/.test(salesB.headers.get("set-cookie") || ""));
const countB = salesBHtml.match(/<span data-wp-count>(\d+)<\/span>/)?.[1];
ok("page de vente B : nombre de modèles lu en base", Number(countB) > 0, countB || "absent");
const galleryB = (salesBHtml.match(/data-wp-gallery>([\s\S]*?)<\/div>\s*<p class="count-line"/)?.[1] || "").match(/<article/g)?.length ?? 0;
ok("page de vente B : galerie des modèles en vedette", galleryB > 0, `${galleryB} cartes`);
ok("page de vente B : aperçu d'un vrai modèle (sans montants)", /data-wp-preview><article class="preview"/.test(salesBHtml) && !/class="lots"[^]*?\d{3} \d{3} FCFA/.test(salesBHtml.split("data-wp-preview")[1]?.split("</article>")[0] || ""));
ok("page de vente B : formulaire de paiement court (/api/checkout)", salesBHtml.includes("/api/checkout"));

// Mesure du comportement : PostHog sur le site public, jamais sur l'administration ; plus de Microsoft Clarity
const posthogKey = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").match(/"POSTHOG_KEY"\s*:\s*"([^"]*)"/)?.[1] || "";
const homeHtml = await (await get("/")).text();
const adminLoginHtml = await (await get("/admin/connexion")).text();
ok("Clarity absent (vitrine, page de vente)", !/clarity\.ms/.test(homeHtml) && !/clarity\.ms/.test(salesHtml));
ok("PostHog configuré sur la vitrine", homeHtml.includes("eu.i.posthog.com") && (!posthogKey || homeHtml.includes(posthogKey)));
ok("PostHog configuré sur la page de vente", salesHtml.includes("eu.i.posthog.com") && (!posthogKey || salesHtml.includes(posthogKey)));
ok("PostHog absent de l'administration", !/posthog/i.test(adminLoginHtml) && (!posthogKey || !adminLoginHtml.includes(posthogKey)));
ok("page de vente : widget de paiement exclu des enregistrements", salesHtml.includes('id="chariow-widget" class="ph-no-capture"'));
ok("page de vente : bandeau de consentement (Europe)", salesHtml.includes("wpConsent"));
if (!posthogKey) console.log("Note : POSTHOG_KEY vide dans wrangler.jsonc, PostHog n'est pas encore activé.");

// Images (R2 MEDIA)
const media = env.SMOKE_MEDIA ? JSON.parse(readFileSync(env.SMOKE_MEDIA, "utf8")) : [];
let publicOk = 0;
const publicKeys = media.filter((m) => m.visibility === "public");
const missing = [];
for (const { key } of publicKeys) {
  const res = await get(`/media/${key}`, { method: "GET" });
  if (res.status === 200) publicOk++;
  else missing.push(`${key} (${res.status})`);
  await res.arrayBuffer().catch(() => {});
}
ok("images publiques servies depuis R2", publicOk === publicKeys.length, `${publicOk}/${publicKeys.length}${missing.length ? ` manquantes : ${missing.slice(0, 5).join(", ")}` : ""}`);

// Webhook Chariow
const payload = JSON.stringify({ event: "successful.sale", sale: { id: "smoke-test" }, product: { id: "prd_smoke" } });
const sign = (body) => `sha256=${createHmac("sha256", env.CHARIOW_PULSE_SECRET || "").update(body).digest("hex")}`;
const bad = await get("/api/webhooks/chariow", { method: "POST", body: payload, headers: { "content-type": "application/json", "x-chariow-signature": "sha256=00" } });
ok("webhook : mauvaise signature refusée", bad.status === 401, String(bad.status));
const good = await get("/api/webhooks/chariow", { method: "POST", body: payload, headers: { "content-type": "application/json", "x-chariow-signature": sign(payload) } });
const goodJson = await good.json().catch(() => ({}));
ok("webhook : signature valide acceptée (événement de test)", good.status === 200 && goodJson.outcome === "test_event", `${good.status} ${JSON.stringify(goodJson)}`);

// Cron (mauvais secret uniquement : le vrai appel enverrait le récapitulatif)
const cron = await get("/api/cron", { method: "POST", headers: { "x-cron-secret": "mauvais" } });
ok("cron : mauvais secret refusé", cron.status === 401, String(cron.status));
const relances = await get("/api/cron/relances", { method: "POST", headers: { "x-cron-secret": "mauvais" } });
ok("cron relances : mauvais secret refusé", relances.status === 401, String(relances.status));

// Désinscription : un lien non signé est refusé
const optout = await get("/api/desinscription?e=test%40example.com&s=prospects&t=faux", { method: "POST" });
ok("désinscription : signature invalide refusée", optout.status === 400, String(optout.status));

// MCP
const rpc = (body, headers = {}) =>
  get("/api/mcp", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers } });
const mcpDenied = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
ok("MCP : sans jeton refusé", mcpDenied.status === 401, String(mcpDenied.status));
const auth = { authorization: `Bearer ${env.MCP_TOKEN}` };
const init = await (await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } }, auth)).json().catch(() => ({}));
ok("MCP : initialize", Boolean(init.result?.serverInfo), init.result?.serverInfo?.name || JSON.stringify(init).slice(0, 200));
const list = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, auth)).json().catch(() => ({}));
const tools = list.result?.tools?.map((t) => t.name) || [];
ok("MCP : tools/list", tools.length > 0, `${tools.length} outils`);
// Outils de création de fiches : présence uniquement (aucune fiche ni fichier créé en production).
const catalogueTools = ["create_plan", "get_plan", "upload_plan_image", "create_upload_link", "set_plan_cover", "reorder_plan_images", "remove_plan_image"];
const missingTools = catalogueTools.filter((t) => !tools.includes(t));
ok("MCP : outils de création de fiches présents", missingTools.length === 0, missingTools.length ? `manquants : ${missingTools.join(", ")}` : catalogueTools.join(", "));
ok("MCP : instructions de publication", /accord explicite/.test(init.result?.instructions || ""));
ok("MCP : instructions d'analyse du comportement (PostHog)", /PostHog/.test(init.result?.instructions || "") && /impact attendu/.test(init.result?.instructions || ""));
const readTool = tools.find((t) => /funnel|summary|resume|list_plans/.test(t));
if (readTool) {
  const call = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: readTool, arguments: {} } }, auth)).json().catch(() => ({}));
  ok(`MCP : tools/call ${readTool}`, call.result && !call.result.isError, JSON.stringify(call.result?.content?.[0]?.text || call.error || "").slice(0, 160));
}
const mcpPath = await get(`/api/mcp/${env.MCP_TOKEN}`, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }), headers: { "content-type": "application/json", accept: "application/json, text/event-stream" } });
ok("MCP : jeton dans l'URL", mcpPath.status === 200, String(mcpPath.status));

// Lien d'envoi de fichiers : refus sans jeton valide (aucun fichier envoyé)
const uploadDenied = await get("/api/televersement?role=render", { method: "PUT", body: "x", headers: { authorization: "Bearer faux.jeton" } });
ok("envoi : jeton invalide refusé", uploadDenied.status === 401, String(uploadDenied.status));
const uploadPage = await get("/televersement");
ok("envoi : page /televersement", uploadPage.status === 200, String(uploadPage.status));

// Admin
const adminDenied = await get("/admin");
ok("admin : redirection sans session", [302, 303, 307, 308].includes(adminDenied.status), String(adminDenied.status));
if (env.SMOKE_ADMIN_EMAIL) {
  const login = await get("/api/admin/connexion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: env.SMOKE_ADMIN_EMAIL, password: env.SMOKE_ADMIN_PASSWORD }) });
  ok("admin : connexion", login.status === 200, String(login.status));
  const cookie = cookieOf(login);
  for (const path of ["/admin", "/admin/membres", "/admin/plans", "/admin/crm", "/admin/ventes", "/admin/reglages"]) {
    const res = await get(path, { headers: { cookie } });
    ok(`admin : GET ${path}`, res.status === 200, String(res.status));
  }
}

// Espace Premium
const premiumDenied = await get("/espace-premium");
ok("premium : redirection sans session", [302, 303, 307, 308].includes(premiumDenied.status), String(premiumDenied.status));
const pdfDenied = await get(`/api/premium/fiche-pdf/${slugs[0] || "villa-v3-037"}`);
ok("premium : fiche PDF refusée sans session", pdfDenied.status === 401, String(pdfDenied.status));
if (env.SMOKE_MEMBER_EMAIL) {
  const login = await get("/api/membre/connexion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: env.SMOKE_MEMBER_EMAIL, code: env.SMOKE_MEMBER_CODE }) });
  ok("premium : connexion membre", login.status === 200, String(login.status));
  const cookie = cookieOf(login);
  for (const path of ["/espace-premium", "/espace-premium/favoris", "/espace-premium/comparer", "/espace-premium/telechargements", ...slugs.slice(0, 3).map((s) => `/espace-premium/plans/${s}`)]) {
    const res = await get(path, { headers: { cookie } });
    ok(`premium : GET ${path}`, res.status === 200, String(res.status));
  }
  // Fiche PDF : assemblée à la demande (lecture seule : rien n'est écrit en D1 ni en R2)
  const started = Date.now();
  const pdf = await get(`/api/premium/fiche-pdf/${slugs[0]}`, { headers: { cookie } });
  const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
  const pdfHead = new TextDecoder().decode(pdfBytes.subarray(0, 5));
  ok("premium : fiche PDF générée", pdf.status === 200 && pdfHead === "%PDF-", `${pdf.status} ${Math.round(pdfBytes.length / 1024)} Ko en ${Date.now() - started} ms`);
  const privateKeys = media.filter((m) => m.visibility === "private");
  let privOk = 0;
  for (const { key } of privateKeys) {
    const res = await get(`/api/premium/fichier/${key}`, { headers: { cookie } });
    if (res.status === 200) privOk++;
    await res.arrayBuffer().catch(() => {});
  }
  ok("premium : fichiers privés servis depuis R2", privOk === privateKeys.length, `${privOk}/${privateKeys.length}`);
  if (privateKeys[0]) {
    const leak = await get(`/media/${privateKeys[0].key}`);
    ok("premium : fichier privé non servi publiquement", leak.status === 404, String(leak.status));
  }
}

console.log(`\n503 passagers (réessayés) : ${transient}`);
console.log(failures ? `${failures} échec(s)` : "Tous les tests passent.");
process.exit(failures ? 1 : 0);
