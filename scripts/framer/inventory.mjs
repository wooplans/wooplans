#!/usr/bin/env node
/**
 * Inventaire du site Framer (lecture seule) : pour chaque URL du sitemap, titre, description,
 * H1, redirection éventuelle ; pour les fiches /catalogue/<slug>, texte et images du CMS.
 * Écrit scripts/framer/out/pages.json (artefact CI) et affiche un résumé.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = "https://www.wooplans.com";
const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))];

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const meta = (html, name) =>
  decode(html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, "i"))?.[1] || "");
const text = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h\d|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const pages = [];
for (const url of urls) {
  const res = await fetch(url, { redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const page = {
    url,
    path: decodeURIComponent(new URL(url).pathname),
    status: res.status,
    location: res.headers.get("location"),
    title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] || ""),
    description: meta(html, "description"),
    ogImage: meta(html, "og:image"),
    h1: decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim()),
  };
  if (page.path.startsWith("/catalogue/")) {
    page.lines = text(html.replace(/[\s\S]*?<body/i, "<body"));
    page.images = [...new Set([...html.matchAll(/https:\/\/framerusercontent\.com\/images\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)/g)].map((m) => m[0]))];
  }
  pages.push(page);
  console.log(`${page.status} ${page.path} | ${page.title} | ${page.h1}${page.images ? ` | ${page.images.length} images` : ""}`);
}

mkdirSync("scripts/framer/out", { recursive: true });
writeFileSync("scripts/framer/out/pages.json", JSON.stringify(pages, null, 2));
const sample = pages.find((p) => p.path === "/catalogue/duplex-d4-001");
if (sample) console.log("\n--- Exemple de fiche (duplex-d4-001) ---\n" + sample.lines.join("\n"));
