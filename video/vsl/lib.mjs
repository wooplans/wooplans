// Chargement de src/timeline.js (script navigateur) depuis Node.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const here = path.dirname(fileURLToPath(import.meta.url));

export function loadTimeline() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(here, "src", "timeline.js"), "utf8"), ctx);
  const file = path.join(here, "timings", "voice.json");
  const timings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  return { api: ctx.VSL_TIMELINE, scenes: ctx.VSL_TIMELINE.build(timings) };
}
