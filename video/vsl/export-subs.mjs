// Exporte les sous-titres (out/vsl.srt et out/vsl.vtt) depuis src/timeline.js.
import fs from "node:fs";
import path from "node:path";
import { here, loadTimeline } from "./lib.mjs";

const { scenes } = loadTimeline();
const cues = scenes.flatMap((s) => s.cues.map((c) => ({ start: s.start + c.start, end: s.start + c.end + 0.2, text: c.text.split(/\s*\/\s*/).join("\n") })));
// Chaque sous-titre reste 0,2 s de plus, sans chevaucher le suivant.
cues.forEach((c, i) => { if (cues[i + 1]) c.end = Math.min(c.end, cues[i + 1].start); });
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
fs.mkdirSync(path.join(here, "out"), { recursive: true });
fs.writeFileSync(path.join(here, "out", "vsl.srt"), cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n"));
fs.writeFileSync(path.join(here, "out", "vsl.vtt"), "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n"));
console.log(`${cues.length} sous-titres, durée ${scenes.at(-1).end.toFixed(1)} s`);
