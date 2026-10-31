// Voix off avec Gradium (même voix que la VSL précédente) : un appel par phrase de script.json,
// silences de début et de fin retirés, dans media/voix/<id>.wav. La durée de chaque phrase est
// écrite dans timings.json, d'où build.mjs calcule tout le minutage de la vidéo.
// Une phrase déjà générée pour le même texte est réutilisée (pas de crédits consommés).
//   GRADIUM_API_KEY=… node voice.mjs
import fs from "node:fs";
import path from "node:path";
import { duration, here, media, run, script } from "./lib.mjs";

const KEY = process.env.GRADIUM_API_KEY;
if (!KEY) { console.error("GRADIUM_API_KEY manquant."); process.exit(1); }
const dir = path.join(media, "voix");
fs.mkdirSync(dir, { recursive: true });
const timingsFile = path.join(here, "timings.json");
const timings = fs.existsSync(timingsFile) ? JSON.parse(fs.readFileSync(timingsFile, "utf8")) : {};

for (const line of script.lines) {
  const wav = path.join(dir, `${line.id}.wav`), txt = path.join(dir, `${line.id}.txt`);
  if (fs.existsSync(wav) && fs.existsSync(txt) && fs.readFileSync(txt, "utf8") === line.text) {
    timings[line.id] = Number(duration(wav).toFixed(3));
    continue;
  }
  const raw = path.join(dir, `${line.id}.raw.wav`);
  const body = JSON.stringify({ text: line.text, voice_id: script.voice.voice_id, output_format: "wav", only_audio: true });
  const code = run("curl", ["-sS", "-L", "-X", "POST", "https://api.gradium.ai/api/post/speech/tts", "-H", `x-api-key: ${KEY}`,
    "-H", "Content-Type: application/json", "--data-binary", "@-", "-o", raw, "-w", "%{http_code}"], { input: body }).toString().trim();
  if (code !== "200") throw new Error(`Gradium ${code} : ${fs.readFileSync(raw, "utf8").slice(0, 300)}`);
  run("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5",
    "-ac", "1", "-ar", "48000", wav]);
  fs.rmSync(raw);
  fs.writeFileSync(txt, line.text);
  timings[line.id] = Number(duration(wav).toFixed(3));
  console.log(`${line.id} ${timings[line.id]} s  ${line.text}`);
}
fs.writeFileSync(timingsFile, JSON.stringify(timings, null, 2) + "\n");
console.log("timings.json à jour ; relancer node build.mjs");
