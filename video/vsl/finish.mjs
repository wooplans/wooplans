// Fichiers livrés à partir du rendu HyperFrames (out/vsl-master.mp4) :
// - out/vsl-catalogue-premium.mp4 : 720 × 900, H.264 deux passes ≈ 600 kb/s + AAC 96 kb/s, faststart (≈ 7,5 Mo) ;
// - out/vsl-catalogue-premium-apercu.mp4 : aperçu muet de 6 s en boucle (accroche), 544 × 680, < 1 Mo ;
// - out/vsl-poster.webp : image d'attente de la section héro (540 × 675).
import fs from "node:fs";
import path from "node:path";
import { duration, here, run } from "./lib.mjs";

const out = path.join(here, "out");
const master = path.join(out, "vsl-master.mp4");
if (!fs.existsSync(master)) { console.error("out/vsl-master.mp4 manquant : lancer npm run render"); process.exit(1); }
const main = path.join(out, "vsl-catalogue-premium.mp4");
const pass = ["-vf", "scale=720:900:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-b:v", "600k", "-maxrate", "1200k", "-bufsize", "2400k", "-pix_fmt", "yuv420p", "-g", "60"];
const log = path.join(out, "x264");
run("ffmpeg", ["-v", "error", "-y", "-i", master, ...pass, "-pass", "1", "-passlogfile", log, "-an", "-f", "mp4", "/dev/null"]);
run("ffmpeg", ["-v", "error", "-y", "-i", master, ...pass, "-pass", "2", "-passlogfile", log, "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", main]);
const preview = path.join(out, "vsl-catalogue-premium-apercu.mp4");
run("ffmpeg", ["-v", "error", "-y", "-ss", "0.3", "-t", "6", "-i", master, "-an", "-vf", "scale=544:680:flags=lanczos,fade=t=in:d=0.3",
  "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", preview]);
const poster = path.join(out, "vsl-poster.webp");
run("ffmpeg", ["-v", "error", "-y", "-ss", "2.6", "-i", master, "-frames:v", "1", "-vf", "scale=540:675:flags=lanczos", "-quality", "82", poster]);
for (const f of [main, preview, poster]) console.log(`${path.basename(f)} ${(fs.statSync(f).size / 1e6).toFixed(2)} Mo${f.endsWith(".mp4") ? ` · ${duration(f).toFixed(1)} s` : ""}`);
for (const f of fs.readdirSync(out).filter((x) => x.startsWith("x264"))) fs.rmSync(path.join(out, f));
