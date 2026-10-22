// Rendu de la VSL image par image avec Chromium, assemblage avec ffmpeg.
//
//   node render.mjs                      vidéo complète muette (out/main-silent.mp4)
//   node render.mjs --mode preview       aperçu muet de 6 s (out/preview.mp4)
//   node render.mjs --mode poster        image d'aperçu (out/poster.jpg)
//   node render.mjs --stills 2,18,40     images clés (out/still-<t>.png)
//   options : --fps 30, --from <s>, --to <s>, --out <fichier>
import { chromium } from "playwright-core";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return acc;
}, []));
const mode = args.mode || "main";
const fps = Number(args.fps || 30);
fs.mkdirSync(path.join(here, "out"), { recursive: true });

const timingsFile = path.join(here, "timings", "voice.json");
const timings = fs.existsSync(timingsFile) ? JSON.parse(fs.readFileSync(timingsFile, "utf8")) : null;

// Images de l'enregistrement d'écran (plan 4) et de l'extrait de Francis (plan 8).
function frames(src, dir, args) {
  if (fs.existsSync(path.join(dir, "f0001.jpg"))) return;
  if (!fs.existsSync(src)) throw new Error(`Fichier manquant : ${src}`);
  fs.mkdirSync(dir, { recursive: true });
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args.pre, "-i", src, "-vf", args.vf, "-q:v", "3", path.join(dir, "f%04d.jpg")]);
}
frames(path.join(here, "out", "ecran", "ecran-b.mp4"), path.join(here, "out", "ecran", "frames"),
  { pre: [], vf: "fps=30,crop=288:614:0:24,scale=398:849:flags=lanczos,unsharp=5:5:0.6" });
frames(path.join(here, "out", "temoignages", "francis.mp4"), path.join(here, "out", "temoignages", "francis"),
  { pre: ["-ss", "10.4", "-t", "5.0"], vf: "fps=30,scale=580:-2:flags=lanczos,crop=580:860:0:40" });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--allow-file-access-from-files", "--disable-gpu", "--font-render-hinting=none"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.error("Erreur dans la page :", e.message); process.exitCode = 1; });
if (timings) await page.addInitScript((t) => { window.VSL_TIMINGS = t; }, timings);
await page.goto("file://" + path.join(here, "src", "index.html"));
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
const duration = await page.evaluate(() => window.VSL.duration);
const frame = (t) => page.evaluate(([t, m]) => window.VSL.renderFrame(t, m), [t, mode]);

if (args.stills) {
  for (const t of String(args.stills).split(",").map(Number)) {
    await frame(t);
    const out = path.join(here, "out", `still-${String(t).replace(".", "_")}.png`);
    await page.screenshot({ path: out });
    console.log(out);
  }
} else if (mode === "poster") {
  await frame(0);
  const out = args.out || path.join(here, "out", "poster.jpg");
  await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  console.log(out);
} else {
  const from = Number(args.from || 0);
  const to = Number(args.to || (mode === "preview" ? 6 : duration));
  const out = args.out || path.join(here, "out", mode === "preview" ? "preview-frames.mp4" : "main-silent.mp4");
  const n = Math.round((to - from) * fps);
  console.log(`Durée ${duration.toFixed(2)} s, rendu de ${n} images → ${out}`);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await frame(from + i / fps);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (fps * 5) === 0) process.stdout.write(`\r${(i / fps).toFixed(0)} s / ${((to - from)).toFixed(0)} s (${((Date.now() - t0) / 1000).toFixed(0)} s écoulées)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("\nTerminé :", out);
}
await browser.close();
