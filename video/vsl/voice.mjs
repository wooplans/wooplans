// Voix off avec Gradium : un appel par bloc de sous-titre (texte prononcé de
// src/timeline.js), puis concaténation dans out/voice.wav. La durée réelle de
// chaque bloc est écrite dans timings/voice.json : l'animation et les
// sous-titres se recalent dessus au prochain rendu.
//
//   GRADIUM_API_KEY=… node voice.mjs --sample   phrase d'accroche seule (out/voix/gradium-accroche.wav)
//   GRADIUM_API_KEY=… node voice.mjs            voix complète
//
// Le plan 8 (témoignages) n'a pas de voix off : ses blocs gardent la durée des extraits.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { here, loadTimeline } from "./lib.mjs";

const KEY = process.env.GRADIUM_API_KEY;
const VOICE = process.env.GRADIUM_VOICE_ID || "TsRKBRWZGYldAeEI";
const URL = process.env.GRADIUM_URL || "https://api.gradium.ai/api/post/speech/tts";
if (!KEY) {
  console.error("GRADIUM_API_KEY manquant (à ajouter dans les secrets de l'environnement).");
  process.exit(1);
}

// Silence après chaque bloc selon la ponctuation finale.
const PAUSE = { ",": 0.12, ":": 0.22, ".": 0.32, "?": 0.38, "!": 0.32 };
const tmp = path.join(here, "out", "voix", "blocs");
fs.mkdirSync(tmp, { recursive: true });

async function tts(text, file) {
  // curl plutôt que fetch : il passe par le proxy HTTPS de l'environnement.
  const body = JSON.stringify({ text, voice_id: VOICE, output_format: "wav", only_audio: true });
  const code = execFileSync("curl", ["-sS", "-L", "-X", "POST", URL, "-H", `x-api-key: ${KEY}`, "-H", "Content-Type: application/json",
    "--data-binary", "@-", "-o", file, "-w", "%{http_code}"], { input: body }).toString().trim();
  if (code !== "200") throw new Error(`Gradium ${code} : ${fs.readFileSync(file, "utf8").slice(0, 300)}`);
  // Normalisation en WAV mono 44,1 kHz, silences de début et de fin retirés.
  const clean = file.replace(/\.raw\.wav$/, ".wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
    "-ac", "1", "-ar", "44100", clean]);
  return clean;
}
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

const { api, scenes } = loadTimeline();

if (process.argv.includes("--sample")) {
  const text = scenes[0].cues.map((c) => c.spoken).join(" ");
  const out = await tts(text, path.join(here, "out", "voix", "gradium-accroche.raw.wav"));
  console.log(out, duration(out).toFixed(2) + " s");
  process.exit(0);
}

const timings = {};
const parts = []; // [fichier ou null (silence), durée]
for (const scene of api.SCENES) {
  const built = scenes.find((s) => s.id === scene.id);
  if (scene.fixed) {
    // Extraits réels des témoignages, au même niveau sonore que la voix.
    scene.clips.forEach((clip, i) => {
      const f = path.join(tmp, `${scene.id}-${i}.wav`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(clip.from), "-t", String(scene.fixed[i]), "-i", path.join(here, "out", "temoignages", clip.file),
        "-af", `loudnorm=I=-18:TP=-2,afade=t=in:d=0.08,afade=t=out:st=${scene.fixed[i] - 0.15}:d=0.15`, "-ac", "1", "-ar", "44100", f]);
      parts.push([f, scene.fixed[i]]);
    });
    continue;
  }
  parts.push([null, scene.lead]);
  const subs = [];
  for (const [i, cue] of built.cues.entries()) {
    // Un bloc déjà généré pour le même texte est réutilisé (pas de crédits Gradium consommés).
    const base = path.join(tmp, `${scene.id}-${i}`);
    const cached = fs.existsSync(`${base}.wav`) && fs.existsSync(`${base}.txt`) && fs.readFileSync(`${base}.txt`, "utf8") === cue.spoken;
    const file = cached ? `${base}.wav` : await tts(cue.spoken, `${base}.raw.wav`);
    if (!cached) fs.writeFileSync(`${base}.txt`, cue.spoken);
    const pause = PAUSE[cue.spoken.trim().slice(-1)] || 0.1;
    const d = duration(file);
    parts.push([file, d], [null, pause]);
    subs.push(Number((d + pause).toFixed(3)));
    console.log(`${scene.id} #${i} ${d.toFixed(2)} s ${cached ? "(réutilisé)" : "(généré)"}  ${cue.spoken}`);
  }
  parts.push([null, scene.tail]);
  timings[scene.id] = { subs };
}

// Assemblage : chaque morceau est ramené à sa durée exacte pour rester calé sur l'image.
const list = parts.map(([f, d], i) => {
  const seg = path.join(tmp, `seg-${String(i).padStart(3, "0")}.wav`);
  const src = f ? ["-i", f] : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"];
  execFileSync("ffmpeg", ["-v", "error", "-y", ...src, "-af", "apad", "-t", d.toFixed(3), "-ac", "1", "-ar", "44100", seg]);
  return `file '${seg}'`;
});
fs.writeFileSync(path.join(tmp, "list.txt"), list.join("\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), path.join(here, "out", "voice.wav")]);
fs.mkdirSync(path.join(here, "timings"), { recursive: true });
fs.writeFileSync(path.join(here, "timings", "voice.json"), JSON.stringify(timings, null, 2) + "\n");
const total = loadTimeline().scenes.at(-1).end;
console.log(`out/voice.wav ${duration(path.join(here, "out", "voice.wav")).toFixed(2)} s, vidéo recalée : ${total.toFixed(2)} s`);
