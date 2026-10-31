// Outils partagés par les scripts de la VSL.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const here = path.dirname(fileURLToPath(import.meta.url));
export const media = path.join(here, "media");
export const script = JSON.parse(fs.readFileSync(path.join(here, "script.json"), "utf8"));

/** Prix du catalogue : src/config/catalogue.json est la source unique (site, page de vente, VSL). */
const catalogue = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "src", "config", "catalogue.json"), "utf8"));
if (catalogue.price !== script.price || catalogue.priceBefore !== script.priceBefore) {
  throw new Error(`Prix de script.json (${script.price} / ${script.priceBefore}) différents de src/config/catalogue.json (${catalogue.price} / ${catalogue.priceBefore}) : mettre à jour la voix off (o1) puis script.json.`);
}

export const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ["pipe", "pipe", "inherit"], ...opts });
export const duration = (f) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
export const fcfa = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
