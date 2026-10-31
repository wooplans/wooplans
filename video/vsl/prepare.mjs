// Prépare les médias de la VSL dans media/ (non versionné) :
// - extraits des 4 témoignages publiés sur la page (/videos/testimonials/), découpés et au même niveau sonore ;
// - rendus 3D de couverture des modèles publiés (page /catalogue) ;
// - photo du témoignage audio de Renaud, logo, musique (mixkit « Let's Play Africa », licence libre mixkit).
// Le plan coté et le rendu original du modèle de démonstration (D4-006) sont réservés aux membres Premium :
// les déposer à la main dans media/showcase/ (plan-rdc.webp, plan-etage.webp, facade.png, nuit.png), via l'outil MCP wooplans get_plan_file.
import fs from "node:fs";
import path from "node:path";
import { here, media, run, script } from "./lib.mjs";

const SITE = "https://www.wooplans.com";
const COVERS = 18;
for (const d of ["temoignages", "covers", "showcase", "voix"]) fs.mkdirSync(path.join(media, d), { recursive: true });
const get = (url, file) => { if (!fs.existsSync(file)) run("curl", ["-sfL", "-o", file, url]); return file; };

// Témoignages : extrait [from, to] de chaque vidéo, vidéo 540 × 960, son normalisé.
for (const t of script.testimonials) {
  const src = get(`${SITE}/videos/testimonials/${t.id}.mp4`, path.join(media, "temoignages", `${t.id}-source.mp4`));
  const d = (t.to - t.from).toFixed(2);
  const af = `loudnorm=I=-16:TP=-1.5,afade=t=in:d=0.08,afade=t=out:st=${(t.to - t.from - 0.2).toFixed(2)}:d=0.2`;
  if (t.kind === "video") {
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(t.from), "-t", d, "-i", src,
      "-vf", "scale=540:960:force_original_aspect_ratio=increase,crop=540:960,fps=30", "-af", af,
      "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", path.join(media, "temoignages", `${t.id}.mp4`)]);
  } else {
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(t.from), "-t", d, "-i", src, "-vn", "-af", af, "-ar", "48000", path.join(media, "temoignages", `${t.id}.wav`)]);
  }
}

// Rendus 3D : une couverture par modèle publié, dans l'ordre de la page /catalogue.
const html = run("curl", ["-sfL", `${SITE}/catalogue`]).toString();
const covers = [...new Set(html.match(/\/media\/public\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.webp/g) || [])];
const seen = new Set();
const picked = covers.filter((p) => { const c = p.split("/")[3]; if (seen.has(c)) return false; seen.add(c); return true; });
picked.slice(0, COVERS).forEach((p, i) => get(SITE + p, path.join(media, "covers", `${String(i).padStart(2, "0")}.webp`)));
const showcase = picked.find((p) => p.includes(`/${script.showcase.toLowerCase()}/`));
if (showcase) get(SITE + showcase, path.join(media, "showcase", "cover.webp"));

get(`${SITE}/assets/digital/temoignage-renaud.webp`, path.join(media, "renaud.webp"));
fs.copyFileSync(path.join(here, "..", "..", "public", "assets", "wooplans-logo-white.png"), path.join(media, "logo.png"));
get("https://assets.mixkit.co/music/218/218.mp3", path.join(media, "music.mp3"));

const missing = ["plan-rdc.webp", "plan-etage.webp", "facade.png"].filter((f) => !fs.existsSync(path.join(media, "showcase", f)));
console.log(`médias prêts dans media/ (${picked.length} modèles trouvés, ${Math.min(COVERS, picked.length)} couvertures)`);
if (missing.length) console.log(`à déposer à la main dans media/showcase/ : ${missing.join(", ")} (fichiers Premium de ${script.showcase})`);

// Image d'attente de chaque témoignage vidéo (cartes visibles avant et après l'extrait).
for (const t of script.testimonials.filter((x) => x.kind === "video")) {
  run("ffmpeg", ["-v", "error", "-y", "-ss", "0.4", "-i", path.join(media, "temoignages", `${t.id}.mp4`), "-frames:v", "1", "-q:v", "3", path.join(media, "temoignages", `${t.id}.jpg`)]);
}

// Enregistrement d'écran du catalogue sur téléphone (fourni par le propriétaire, déposé dans
// media/ecran/source.mp4) : accéléré × 2,5, sans son, 540 px de large, pour l'écran du téléphone.
const ecranSrc = path.join(media, "ecran", "source.mp4");
if (fs.existsSync(ecranSrc)) {
  run("ffmpeg", ["-v", "error", "-y", "-i", ecranSrc, "-an", "-vf", "setpts=PTS/2.5,scale=540:-2,fps=30",
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", path.join(media, "ecran", "catalogue.mp4")]);
} else console.log("facultatif : media/ecran/source.mp4 (enregistrement d'écran du catalogue) absent, la fiche du modèle défile à la place");
