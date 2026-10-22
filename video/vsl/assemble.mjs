// Assemblage et compression aux poids visés.
//   node assemble.mjs main      out/main-silent.mp4 (+ out/voice.wav, + audio/music.mp3) → out/vsl-catalogue-premium.mp4
//   node assemble.mjs preview   out/preview-frames.mp4 → out/vsl-catalogue-premium-apercu.mp4 (muet, ≤ 1 Mo)
//   node assemble.mjs poster    out/poster.jpg → out/vsl-catalogue-premium-poster.jpg / .webp
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { here } from "./lib.mjs";

const out = (f) => path.join(here, "out", f);
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit", cwd: path.join(here, "out") });
const size = (f) => (fs.statSync(f).size / 1e6).toFixed(2) + " Mo";
const what = process.argv[2] || "main";

if (what === "main") {
  const voice = fs.existsSync(out("voice.wav")) ? out("voice.wav") : null;
  const music = fs.existsSync(path.join(here, "audio", "music.mp3")) ? path.join(here, "audio", "music.mp3") : null;
  const dst = out(voice ? "vsl-catalogue-premium.mp4" : "vsl-catalogue-premium-animatique.mp4");
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out("main-silent.mp4")]).toString());
  const inputs = ["-i", out("main-silent.mp4")];
  let filter = null, maps = ["-map", "0:v"];
  if (voice && music) {
    inputs.push("-i", voice, "-stream_loop", "-1", "-i", music);
    // Musique discrète, abaissée sous la voix (sidechain), fondu de fin.
    filter = `[2:a]volume=0.2,afade=t=in:d=1,afade=t=out:st=${(dur - 3).toFixed(2)}:d=3[m];[1:a]asplit=2[v1][v2];[m][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[v2][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5[a]`;
    maps.push("-map", "[a]");
  } else if (voice) {
    inputs.push("-i", voice);
    filter = "[1:a]loudnorm=I=-16:TP=-1.5[a]";
    maps.push("-map", "[a]");
  }
  // Deux passes, débit calculé pour tenir dans TARGET_MB (6 Mo par défaut, visiteurs
  // sur données mobiles) : (poids × 8 / durée) − audio, avec 4 % de marge.
  const kbps = Math.floor((Number(process.env.TARGET_MB || 6) * 8e3 * 0.96) / dur - (voice ? 96 : 0));
  const v = ["-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-b:v", `${kbps}k`, "-maxrate", `${Math.round(kbps * 1.8)}k`, "-bufsize", `${kbps * 3}k`, "-g", "120"];
  console.log(`Durée ${dur.toFixed(1)} s → vidéo ${kbps} kb/s`);
  ff([...inputs.slice(0, 2), ...v, "-pass", "1", "-an", "-f", "mp4", "/dev/null"]);
  ff([...inputs, ...(filter ? ["-filter_complex", filter] : []), ...maps, ...v, "-pass", "2",
    ...(voice ? ["-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-shortest"] : ["-an"]), "-movflags", "+faststart", dst]);
  console.log(dst, size(dst));
} else if (what === "preview") {
  const dst = out("vsl-catalogue-premium-apercu.mp4");
  ff(["-i", out("preview-frames.mp4"), "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-maxrate", "1100k", "-bufsize", "2000k",
    "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", dst]);
  console.log(dst, size(dst));
} else if (what === "poster") {
  ff(["-i", out("poster.jpg"), "-q:v", "4", out("vsl-catalogue-premium-poster.jpg")]);
  ff(["-i", out("poster.jpg"), "-c:v", "libwebp", "-quality", "78", out("vsl-catalogue-premium-poster.webp")]);
  console.log(size(out("vsl-catalogue-premium-poster.jpg")), size(out("vsl-catalogue-premium-poster.webp")));
}
