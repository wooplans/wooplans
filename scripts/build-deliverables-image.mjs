// Génère l'image de partage « Ce que contiennent les plans complets » (1080×1350, WhatsApp / réseaux).
// Usage : node --experimental-strip-types scripts/build-deliverables-image.mjs
// Nécessite Chromium (variable CHROMIUM, sinon /opt/pw-browsers/chromium).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DELIVERABLES } from "../src/lib/deliverables.ts";

const root = resolve(import.meta.dirname, "..");
const logo = readFileSync(join(root, "public/assets/wooplans-logo-white.png")).toString("base64");
const montserrat = readFileSync(join(root, "src/app/fonts/montserrat-latin-800-normal.woff2")).toString("base64");
const montserratSemi = readFileSync(join(root, "src/app/fonts/montserrat-latin-700-normal.woff2")).toString("base64");

const SHORT = [
  "Principe d'implantation des fondations",
  "Espaces, pièces, circulations, ouvertures, dimensions",
  "Élévation principale du bâtiment",
  "Élévation arrière du bâtiment",
  "Élévation latérale gauche",
  "Élévation latérale droite",
  "Niveaux, hauteurs et relations entre espaces",
  "Seconde coupe verticale complémentaire",
  "Disposition générale de la toiture",
  "Implantation du dispositif d'assainissement",
];

const items = DELIVERABLES.map(
  (d, i) => `<li><b>${i + 1}</b><div><strong>${d.title}</strong><span>${SHORT[i]}</span></div></li>`,
).join("");

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${montserrat})}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${montserratSemi})}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;background:#F5F7F9;font-family:"Segoe UI",Arial,sans-serif;color:#1E2933;display:flex;flex-direction:column}
header{background:#0F5B59;color:#fff;padding:44px 64px 40px}
header img{height:52px}
h1{font-family:M;font-weight:800;font-size:54px;line-height:1.1;margin-top:28px;color:#fff}
header p{font-size:25px;margin-top:14px;color:#ffffffd9}
.tag{display:inline-block;margin-top:20px;background:#E7C36C;color:#1E2933;font-family:M;font-weight:700;font-size:20px;padding:8px 18px;border-radius:99px}
main{padding:30px 64px 0;flex:1}
ul{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:16px 16px}
li{display:flex;gap:14px;align-items:center;background:#fff;border:1px solid #DFE5EA;border-radius:18px;padding:22px 18px}
li b{flex:none;width:44px;height:44px;border-radius:50%;background:#F08A2E;color:#fff;font-family:M;font-weight:700;font-size:21px;display:flex;align-items:center;justify-content:center}
li strong{display:block;font-size:21px}
li span{display:block;font-size:16px;color:#6B7280;margin-top:2px;line-height:1.25}
.note{margin-top:14px;font-size:17px;color:#6B7280;font-style:italic}
.custom{margin:22px 64px 0;background:#E7C36C26;border:2px solid #E7C36C;border-radius:22px;padding:22px 28px}
.custom h2{font-family:M;font-weight:800;font-size:28px;color:#0F5B59}
.custom p{font-size:21px;margin-top:8px;line-height:1.35}
footer{margin-top:22px;background:#0F5B59;color:#fff;padding:26px 64px;display:flex;justify-content:space-between;align-items:center}
footer strong{font-family:M;font-weight:700;font-size:26px}
footer span{font-size:20px;color:#ffffffd9}
.cta{background:#F08A2E;color:#fff;font-family:M;font-weight:700;font-size:22px;padding:14px 26px;border-radius:99px}
</style><body>
<header><img src="data:image/png;base64,${logo}" alt=""><h1>Ce que contiennent vos plans complets</h1><p>Le dossier livré pour votre villa ou votre duplex</p><span class="tag">${DELIVERABLES.length} plans livrés pour chaque projet</span></header>
<main><ul>${items}</ul><p class="note">Livrés pour chacun de vos projets : villa et duplex.</p></main>
<section class="custom"><h2>Vos plans sont personnalisables</h2><p>Donnez-nous vos exigences : nous modifions le modèle de votre choix selon votre convenance.</p></section>
<footer><div><strong>wooplans.com</strong><br><span>Détails : wooplans.com/livrables-plans-complets</span></div><div class="cta">Écrivez-nous sur WhatsApp</div></footer>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "wp-img-"));
const file = join(dir, "livrables.html");
const out = join(root, "public/images/livrables-plans-complets.png");
const raw = join(dir, "raw.png");
writeFileSync(file, html);
execFileSync(process.env.CHROMIUM || "/opt/pw-browsers/chromium", [
  "--headless", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1080,1500", `--screenshot=${raw}`, `file://${file}`,
], { stdio: "inherit" });
execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).crop((0,0,1080,1350)).save(sys.argv[2],optimize=True)", raw, out]);
console.log("Image écrite :", out);
