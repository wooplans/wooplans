// Génère index.html, la composition HyperFrames de la VSL, à partir de script.json (texte, extraits
// des témoignages, données du modèle de démonstration) et de timings.json (durée réelle de chaque
// phrase de voix off, écrite par voice.mjs). Tout le minutage en découle : changer une phrase,
// relancer voice.mjs puis ce script, et l'animation, les sous-titres et le son restent calés.
//   node build.mjs   puis   npx hyperframes lint .   puis   npx hyperframes render …
import fs from "node:fs";
import path from "node:path";
import { fcfa, here, script } from "./lib.mjs";

const timings = JSON.parse(fs.readFileSync(path.join(here, "timings.json"), "utf8"));
const W = 1080, H = 1350;
const r2 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sd = script.showcaseData;
// Modèle de démonstration (script.json « showcase ») : fichiers Premium déposés dans media/showcase/
// (plan-rdc.webp, plan-etage.webp, facade.png, nuit.png, r-*.webp : voir README).
const SC = path.join(here, "media", "showcase");
for (const f of ["plan-rdc.webp", "plan-etage.webp", "facade.png"]) if (!fs.existsSync(path.join(SC, f))) throw new Error(`media/showcase/${f} manquant (fichiers Premium de ${script.showcase})`);
const facade = "media/showcase/facade.png";
const extraRenders = fs.readdirSync(SC).filter((f) => /^r-.*\.webp$/.test(f) || f === "nuit.png").sort().map((f) => `media/showcase/${f}`);
const label = `${sd.kind} ${sd.code}`;
const covers = fs.readdirSync(path.join(here, "media", "covers")).filter((f) => f.endsWith(".webp")).sort().map((f) => `media/covers/${f}`);
if (covers.length < 12) throw new Error("couvertures manquantes : lancer node prepare.mjs");
const cover = (i) => covers[i % covers.length];

// ---------------------------------------------------------------- minutage
const LINE_GAP = 0.28, SCENE_GAP = 0.45, LEAD = 0.35, XFADE = 0.35;
const T = {}; // id -> { s, e }
const sceneStart = {};
const order = [];
let t = 0.5, prev = null;
for (const line of script.lines) {
  const d = timings[line.id];
  if (!d) throw new Error(`durée manquante pour ${line.id} : lancer node voice.mjs`);
  if (line.scene !== prev) {
    if (prev) t += SCENE_GAP;
    sceneStart[line.scene] = prev ? r2(t - LEAD) : 0;
    order.push(line.scene);
  }
  T[line.id] = { s: r2(t), e: r2(t + d) };
  t += d + LINE_GAP;
  prev = line.scene;
  if (line.id === "t0") {
    t += 0.25;
    for (const tm of script.testimonials) {
      T[tm.id] = { s: r2(t), e: r2(t + tm.to - tm.from) };
      t += tm.to - tm.from + 0.55;
    }
  }
}
T.cta = { s: r2(T.o2.e + 0.25), e: r2(T.o2.e + 4.2) };
const TOTAL = r2(T.cta.e);
const sceneEnd = (id) => { const i = order.indexOf(id); return i < order.length - 1 ? sceneStart[order[i + 1]] : TOTAL; };
const S = Object.fromEntries(order.map((id) => [id, { s: sceneStart[id], e: sceneEnd(id) }]));

// ---------------------------------------------------------------- sous-titres
// Coupés en morceaux de 2 lignes au plus, minutés au prorata du nombre de caractères.
const HL = ["inspiration", "plans et les devis", "près de 100 modèles", "Catalogue Premium", "un seul catalogue", "plan de distribution",
  "poste par poste", "dimensions du terrain", "claire et précise", "témoigner", "gratuitement", "nouveaux plans", "29 000 FCFA", "aujourd'hui", "brouette de chantier"];
function chunks(text, max = 74) {
  const words = text.split(" "), out = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
    if (/[,:?!.]$/.test(w) && cur.length > max * 0.55) { out.push(cur); cur = ""; }
  }
  if (cur) out.push(cur);
  return out;
}
function highlight(s) {
  let h = esc(s);
  for (const k of HL) h = h.replace(esc(k), `<em>${esc(k)}</em>`);
  return h;
}
const captions = [];
for (const line of script.lines) {
  const { s, e } = T[line.id];
  const parts = chunks(line.caption || line.text);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let c = s;
  parts.forEach((p, i) => {
    const d = (e - s) * p.length / total;
    const end = i === parts.length - 1 ? e + 0.22 : c + d;
    captions.push({ s: r2(c), d: r2(end - c), html: highlight(p) });
    c += d;
  });
}
for (const tm of script.testimonials) {
  const { s, e } = T[tm.id];
  const parts = chunks(tm.caption, 66);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let c = s;
  parts.forEach((p, i) => {
    const d = (e - s) * p.length / total;
    captions.push({ s: r2(c), d: r2((i === parts.length - 1 ? e + 0.15 : c + d) - c), html: (i === 0 ? "« " : "") + esc(p) + (i === parts.length - 1 ? " »" : ""), quote: true });
    c += d;
  });
}

// ---------------------------------------------------------------- scènes
const scene = (id, inner, z) => `
<div id="sc-${id}" class="scene clip" data-start="${S[id].s}" data-duration="${r2(S[id].e - S[id].s + (id === order.at(-1) ? 0 : XFADE))}" data-track-index="1" style="z-index:${z}">${inner}
</div>`;

const col = (k, n) => Array.from({ length: n }, (_, i) => `<img src="${cover(k * 5 + i)}" alt="">`).join("");
const scAccroche = scene("accroche", `
  <div class="wall"><div class="col c1">${col(0, 6)}</div><div class="col c2">${col(1, 6)}</div><div class="col c3">${col(2, 6)}</div></div>
  <div class="shade"></div>
  <div class="hook"><div class="w w1">Besoin</div><div class="w w2">d'<em>inspiration</em>&nbsp;?</div><div class="w w3">pour votre projet de construction</div></div>
  <div class="cmp">
    <div class="cmp-row"><span class="chip c-plan">Plans</span><span class="plus">+</span><span class="chip c-devis">Devis</span></div>
    <div class="count"><small>près de</small><b id="cnt">100</b><small>modèles de maisons</small></div>
    <div class="cmp-tag">à comparer avant de choisir</div>
  </div>`, 1);

// Écran du téléphone : la fiche Premium du modèle qui défile (rendus, distributions cotées, devis).
const screenFiche = `<div class="fiche">
  <div class="fi-bar"><b>${label}</b><span>Premium</span></div>
  <img class="fi-cover" src="${facade}" alt="">
  <div class="fi-chips"><span>${sd.bedrooms} ch.</span><span>${sd.surface} m²</span><span>${sd.levels}</span></div>
  <div class="fi-h">Distribution RDC</div><img class="fi-plan" src="media/showcase/plan-rdc.webp" alt="">
  <div class="fi-h">Distribution étage</div><img class="fi-plan" src="media/showcase/plan-etage.webp" alt="">
  <div class="fi-h">Devis poste par poste</div>
  ${sd.lots.slice(0, 6).map(([l, a]) => `<div class="fi-row"><span>${esc(l)}</span><b>${fcfa(a)}</b></div>`).join("")}
  <div class="fi-h">Rendus 3D</div>${extraRenders.map((r) => `<img class="fi-render" src="${r}" alt="">`).join("")}
</div>`;
const flyPos = [[60, 250], [800, 210], [40, 620], [830, 560], [70, 960], [810, 930]];
const scCatalogue = scene("catalogue", `
  <div class="premium"><span>Catalogue</span><b>Premium</b><i class="shine"></i></div>
  <div class="phone"><div class="notch"></div><div class="screen">${screenFiche}</div></div>
  ${flyPos.map(([x, y], i) => `<img class="fly f${i}" src="${cover(i + 12)}" alt="" style="left:${x}px;top:${y}px">`).join("")}`, 2);

const pill = (n, txt) => `<div class="pill"><span>${n}</span>${txt}</div>`;
const scPlan = scene("plan", `
  ${pill(1, "Plan de distribution")}
  <div class="sheet plan-sheet ps1"><img class="plan-img" src="media/showcase/plan-rdc.webp" alt=""><div class="scan"></div><span class="lvl">RDC</span></div>
  <div class="sheet plan-sheet ps2"><img class="plan-img" src="media/showcase/plan-etage.webp" alt=""><div class="scan"></div><span class="lvl">Étage</span></div>
  <div class="tagc tg1"><b>${sd.bedrooms}</b> chambres</div>
  <div class="tagc tg2"><b>${sd.surface} m²</b></div>
  <div class="tagc tg3"><b>${sd.bathrooms}</b> salles de bain</div>
  <div class="ref">${label}</div>`, 3);

const scDevis = scene("devis", `
  ${pill(2, "Devis poste par poste")}
  <div class="sheet devis-sheet">
    <div class="dv-head"><span>Devis de construction</span><span>${label}</span></div>
    ${sd.lots.map(([l, a], i) => `<div class="dv-row r${i}"><span>${esc(l)}</span><b>${fcfa(a)}</b></div>`).join("")}
    <div class="dv-total"><span>Total estimé</span><b><span id="dvt">0</span> FCFA</b></div>
  </div>`, 4);

const px = 32, [lw, ld] = sd.land, [bw, bd] = sd.building;
const LX = (W - lw * px) / 2, LY = 300;
const scTerrain = scene("terrain", `
  ${pill(3, "Terrain nécessaire")}
  <svg class="land" width="${W}" height="1060" viewBox="0 0 ${W} 1060">
    <rect class="lot" x="${LX}" y="${LY}" width="${lw * px}" height="${ld * px}" rx="6"/>
    <rect class="house" x="${LX + (lw - bw) * px / 2}" y="${LY + 2.4 * px}" width="${bw * px}" height="${bd * px}" rx="4"/>
    <text class="hl" x="${W / 2}" y="${LY + 2.4 * px + bd * px / 2}">Maison ${bw} × ${bd} m</text>
    <g class="dimw"><line x1="${LX}" y1="${LY - 34}" x2="${LX + lw * px}" y2="${LY - 34}"/><text x="${W / 2}" y="${LY - 50}">${lw} m</text></g>
    <g class="dimd"><line x1="${LX - 34}" y1="${LY}" x2="${LX - 34}" y2="${LY + ld * px}"/><text x="${LX - 52}" y="${LY + ld * px / 2}" transform="rotate(-90 ${LX - 52} ${LY + ld * px / 2})">${ld} m</text></g>
  </svg>
  <div class="land-badge">Terrain minimum&nbsp;: <b>${sd.landArea} m²</b></div>`, 5);

const M = (n) => (n / 1e6).toFixed(1).replace(".", ",");
const scClarte = scene("clarte", `
  <div class="bgimg" style="background-image:url(${facade})"></div>
  <div class="hero-img"><img src="${facade}" alt=""></div>
  <div class="budget"><small>Budget de construction estimé</small><b>${M(sd.budget[0])} – ${M(sd.budget[1])} M FCFA</b></div>
  <div class="checks"><span class="ck k1">Plan</span><span class="ck k2">Devis</span><span class="ck k3">Terrain</span></div>`, 6);

const tcards = script.testimonials.map((tm, i) => tm.kind === "video"
  ? `<div class="tcard tc${i}" style="background-image:url(media/temoignages/${tm.id}.jpg)"></div>`
  : `<div class="tcard tc${i} audio" style="background-image:url(media/renaud.webp)">
</div>`).join("");
// Vidéos des témoignages : enfants directs de la scène racine (exigence HyperFrames), posées sur leur carte
// et déplacées avec elle ; le nom passe au-dessus de la vidéo.
const tvideos = script.testimonials.map((tm, i) => (tm.kind === "video"
  ? `<video id="v-${tm.id}" class="clip tvid tc${i}" src="media/temoignages/${tm.id}.mp4" data-start="${T[tm.id].s}" data-duration="${r2(T[tm.id].e - T[tm.id].s)}" data-has-audio="true" data-track-index="${3 + i}" playsinline></video>\n` : "")
  + `<div class="tname tc${i}" ><b>${esc(tm.name)}</b><span>${tm.kind === "video" ? "Client du Catalogue Premium" : "Témoignage audio"}</span></div>`).join("\n");
const scTemoignages = scene("temoignages", `
  <div class="t-title"><small>Ils ont obtenu le catalogue</small><b>Ils en parlent</b><span class="stars">★★★★★</span></div>
  ${tcards}`, 7);

const newImgs = Array.from({ length: 9 }, (_, i) => `<div class="nc n${i}"><img src="${cover(i + 6)}" alt="">${[2, 4, 7].includes(i) ? '<span class="new">Nouveau</span>' : ""}</div>`).join("");
const scNouveaux = scene("nouveaux", `
  <div class="n-title"><b>Nouveaux plans</b><small>ajoutés régulièrement au catalogue</small></div>
  <div class="ngrid">${newImgs}</div>
  <div class="stamp">Gratuit<small>à vie</small></div>`, 8);

const scOffre = scene("offre", `
  <div class="offer">
    <div class="o-label">Prix promotionnel</div>
    <div class="o-old"><span>${fcfa(script.priceBefore)} FCFA</span><i class="strike"></i></div>
    <div class="o-now">${fcfa(script.price)}<small>FCFA</small></div>
    <div class="o-badge">–${Math.round((1 - script.price / script.priceBefore) * 100)}&nbsp;%</div>
    <div class="o-today">Aujourd'hui</div>
  </div>
  <div class="barrow">
    <svg viewBox="0 0 220 130" width="220" height="130" fill="none" stroke="#E7C36C" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M44 30h140l-26 50H74z" fill="#E7C36C" fill-opacity=".35"/><path d="M74 80 6 58M74 80l116 26M84 82l-8 38"/><circle cx="192" cy="106" r="17"/></svg>
    <span>Moins que le prix<br>d'une <b>brouette de chantier</b></span>
  </div>
  <div class="cta-wrap">
    <div class="cta">Obtenir le catalogue</div>
    <div class="arrow">↓</div>
    <div class="pay"><span>Orange Money</span><span>MTN MoMo</span><span>Wave</span><span>Moov</span></div>
    <div class="site">wooplans.com</div>
  </div>`, 9);

// ---------------------------------------------------------------- son
const voice = script.lines.map((l, i) => `<audio id="a-${l.id}" class="clip" src="media/voix/${l.id}.wav" data-start="${T[l.id].s}" data-duration="${r2(T[l.id].e - T[l.id].s)}" data-track-index="20" data-volume="1"></audio>`).join("\n");
const renaud = script.testimonials.find((x) => x.kind === "audio");
const tStart = T[script.testimonials[0].id].s - 0.3, tEnd = T[script.testimonials.at(-1).id].e + 0.3;
const music = [
  [0, tStart, 0.16, 0],
  [tStart, tEnd, 0.035, 0],
  [tEnd, TOTAL, 0.16, 2.5],
].map(([a, b, v, fo], i) => `<audio id="m-${i}" class="clip" src="media/music.mp3" data-start="${r2(a)}" data-duration="${r2(b - a)}" data-media-start="${r2(a)}" data-volume="${v}" data-fade-in="${i ? 0.4 : 0.8}" data-fade-out="${fo || 0.4}" data-track-index="21"></audio>`).join("\n");

// ---------------------------------------------------------------- animation (GSAP, temps absolus)
const js = `
const T = ${JSON.stringify(T)};
const S = ${JSON.stringify(S)};
const tl = gsap.timeline({ paused: true });
const E = "power3.out", B = "back.out(1.7)";
const fmt = (n) => String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");

// Fondu d'entrée de chaque scène (la précédente reste dessous pendant le fondu).
${JSON.stringify(order)}.forEach((id, i) => { if (i) tl.fromTo("#sc-" + id, { opacity: 0 }, { opacity: 1, duration: ${XFADE}, ease: "none" }, S[id].s); });

// Logo et barre de progression
tl.fromTo("#logo", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, 0.2);
tl.fromTo("#progress i", { scaleX: 0 }, { scaleX: 1, duration: ${TOTAL}, ease: "none" }, 0);

// 1. Accroche
tl.fromTo(".wall", { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: E }, 0);
tl.fromTo(".c1", { y: 0 }, { y: -520, duration: S.accroche.e - S.accroche.s + 0.4, ease: "none" }, 0);
tl.fromTo(".c2", { y: -560 }, { y: 0, duration: S.accroche.e - S.accroche.s + 0.4, ease: "none" }, 0);
tl.fromTo(".c3", { y: -80 }, { y: -600, duration: S.accroche.e - S.accroche.s + 0.4, ease: "none" }, 0);
tl.fromTo(".hook .w", { opacity: 0, y: 70, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: B, stagger: 0.35 }, T.q1.s);
tl.to(".hook", { opacity: 0, y: -160, scale: 0.85, duration: 0.5, ease: "power2.in" }, T.q2.s - 0.1);
tl.to(".shade", { opacity: 0.9, duration: 0.6 }, T.q2.s);
tl.fromTo(".c-plan", { opacity: 0, x: -200, rotation: -12 }, { opacity: 1, x: 0, rotation: -4, duration: 0.6, ease: B }, T.q2.s + 1.3);
tl.fromTo(".plus", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.4, ease: B }, T.q2.s + 1.65);
tl.fromTo(".c-devis", { opacity: 0, x: 200, rotation: 12 }, { opacity: 1, x: 0, rotation: 4, duration: 0.6, ease: B }, T.q2.s + 1.85);
tl.fromTo(".count", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, T.q2.s + 2.5);
const cnt = { v: 0 };
tl.fromTo(cnt, { v: 0 }, { v: 100, duration: 1.3, ease: "power2.out", onUpdate: () => { document.getElementById("cnt").textContent = Math.round(cnt.v); } }, T.q2.s + 2.6);
tl.fromTo(".cmp-tag", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, T.q2.s + 4.2);

// 2. Le Catalogue Premium
tl.fromTo(".premium span", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, T.c1.s + 2.0);
tl.fromTo(".premium b", { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: B }, T.c1.s + 2.35);
tl.fromTo(".premium .shine", { x: -700 }, { x: 900, duration: 1.1, ease: "power2.inOut" }, T.c1.s + 2.9);
tl.fromTo(".phone", { y: 900, rotation: 8 }, { y: 0, rotation: 0, duration: 0.9, ease: E }, S.catalogue.s + 0.1);
// Défilement de la fiche : couverture, puis distribution RDC, étage, devis et rendus.
[[S.catalogue.s + 1.6, -300], [T.c1.e - 0.6, -770], [T.c2.s + 1.2, -1230], [T.c2.e - 0.4, -1700]].forEach(([at, y]) => tl.to(".fiche", { y, duration: 0.9, ease: "power2.inOut" }, at));
tl.fromTo(".fly", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.45, ease: B, stagger: 0.08 }, T.c2.s);
${flyPos.map(([x, y], i) => `tl.to(".f${i}", { x: ${W / 2 - 110 - x}, y: ${700 - y}, scale: 0.2, opacity: 0, rotation: 20, duration: 0.7, ease: "power2.in" }, T.c2.s + ${(1.4 + i * 0.12).toFixed(2)});`).join("\n")}
tl.to(".phone", { scale: 1.05, duration: 0.25, yoyo: true, repeat: 3, ease: "power1.inOut" }, T.c2.s + 1.9);

// 3. Plan de distribution
tl.fromTo("#sc-plan .pill", { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.5, ease: B }, S.plan.s + 0.2);
tl.fromTo(".ps1", { opacity: 0, y: 80, rotation: -6 }, { opacity: 1, y: 0, rotation: -2, duration: 0.7, ease: E }, S.plan.s + 0.2);
tl.fromTo(".ps2", { opacity: 0, y: 80, rotation: 6 }, { opacity: 1, y: 0, rotation: 2, duration: 0.7, ease: E }, S.plan.s + 0.6);
[".ps1", ".ps2"].forEach((p, i) => {
  tl.fromTo(p + " .plan-img", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power2.inOut" }, S.plan.s + 0.6 + i * 0.4);
  tl.fromTo(p + " .scan", { y: 0, opacity: 1 }, { y: 470, duration: 1.3, ease: "power2.inOut" }, S.plan.s + 0.6 + i * 0.4);
  tl.to(p + " .scan", { opacity: 0, duration: 0.2 }, S.plan.s + 1.9 + i * 0.4);
});
tl.fromTo(".tagc", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: B, stagger: 0.3 }, S.plan.s + 1.6);
tl.fromTo("#sc-plan .ref", { opacity: 0 }, { opacity: 1, duration: 0.4 }, S.plan.s + 1.0);

// 4. Devis poste par poste
tl.fromTo("#sc-devis .pill", { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.5, ease: B }, S.devis.s + 0.15);
tl.fromTo(".devis-sheet", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, S.devis.s + 0.1);
tl.fromTo(".dv-row", { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.35, ease: E, stagger: 0.13 }, S.devis.s + 0.45);
tl.fromTo(".dv-total", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: B }, S.devis.s + 1.6);
const dv = { v: 0 };
tl.fromTo(dv, { v: 0 }, { v: ${sd.total}, duration: 1.2, ease: "power2.out", onUpdate: () => { document.getElementById("dvt").textContent = fmt(dv.v); } }, S.devis.s + 1.7);

// 5. Terrain
tl.fromTo("#sc-terrain .pill", { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.5, ease: B }, S.terrain.s + 0.15);
tl.fromTo(".lot", { strokeDashoffset: 2600 }, { strokeDashoffset: 0, duration: 1.3, ease: "power2.inOut" }, S.terrain.s + 0.3);
tl.fromTo(".lot", { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.6 }, S.terrain.s + 1.3);
tl.fromTo(".dimw, .dimd", { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.25 }, S.terrain.s + 1.0);
tl.fromTo(".house", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5, ease: B }, S.terrain.s + 1.6);
tl.fromTo(".land .hl", { opacity: 0 }, { opacity: 1, duration: 0.4 }, S.terrain.s + 1.9);
tl.fromTo(".land-badge", { opacity: 0, y: 40, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: B }, S.terrain.s + 2.3);

// 6. Une idée claire et précise
tl.fromTo(".bgimg", { scale: 1.3 }, { scale: 1.1, duration: S.clarte.e - S.clarte.s + 0.4, ease: "none" }, S.clarte.s);
tl.fromTo(".hero-img", { opacity: 0, y: 60, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: E }, S.clarte.s + 0.1);
tl.fromTo(".hero-img img", { scale: 1.15 }, { scale: 1, duration: S.clarte.e - S.clarte.s, ease: "none" }, S.clarte.s);
tl.fromTo(".budget", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.6, ease: B }, T.b1.s + 1.6);
tl.fromTo(".ck", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: B, stagger: 0.25 }, T.b2.s + 0.3);

// 7. Témoignages
tl.fromTo(".t-title > *", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5, ease: B, stagger: 0.18 }, S.temoignages.s + 0.2);
tl.to(".t-title", { opacity: 0, y: -120, duration: 0.4, ease: "power2.in" }, T.${script.testimonials[0].id}.s - 0.45);
${script.testimonials.map((tm, i) => `
tl.fromTo(".tc${i}", { opacity: 0, x: 720 }, { opacity: 1, x: 0, duration: 0.5, ease: E }, T.${tm.id}.s - 0.45);
${i < script.testimonials.length - 1 ? `tl.to(".tc${i}", { opacity: 0, x: -720, duration: 0.45, ease: "power2.in" }, T.${tm.id}.e + 0.05);` : `tl.to(".tc${i}", { opacity: 0, duration: 0.35 }, S.nouveaux.s);`}`).join("")}
// Carte audio de Renaud : léger battement pendant l'extrait.
tl.fromTo(".tcard.audio", { scale: 1 }, { scale: 1.025, duration: 0.5, yoyo: true, repeat: Math.floor((T.${renaud.id}.e - T.${renaud.id}.s) / 0.5), ease: "sine.inOut" }, T.${renaud.id}.s);

// 8. Nouveaux plans, gratuits
tl.fromTo(".n-title > *", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: E, stagger: 0.15 }, S.nouveaux.s + 0.15);
tl.fromTo(".nc", { opacity: 0, y: -260, rotation: -6 }, { opacity: 1, y: 0, rotation: 0, duration: 0.5, ease: "bounce.out", stagger: 0.12 }, S.nouveaux.s + 0.4);
tl.fromTo(".new", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.35, ease: B, stagger: 0.2 }, T.n1.s + 2.2);
tl.fromTo(".stamp", { opacity: 0, scale: 3, rotation: -40 }, { opacity: 1, scale: 1, rotation: -12, duration: 0.45, ease: "power4.in" }, T.n1.s + 1.75);
tl.to(".ngrid", { x: 10, duration: 0.05, yoyo: true, repeat: 5 }, T.n1.s + 2.2);

// 9. Offre et appel à l'action
tl.fromTo(".offer", { opacity: 0, scale: 0.85, y: 60 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: B }, S.offre.s + 0.2);
tl.fromTo(".o-label", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, T.o1.s + 2.0);
tl.fromTo(".o-old", { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.o1.s + 2.4);
tl.fromTo(".strike", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.inOut" }, T.o1.s + 3.6);
tl.to(".o-old", { opacity: 0.55, duration: 0.3 }, T.o1.s + 4.0);
tl.fromTo(".o-now", { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(2)" }, T.o1.s + 4.25);
tl.fromTo(".o-badge", { opacity: 0, scale: 0, rotation: -30 }, { opacity: 1, scale: 1, rotation: 8, duration: 0.45, ease: B }, T.o1.s + 4.9);
tl.fromTo(".o-today", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: B }, T.o1.s + 6.3);
tl.to(".offer", { y: -150, scale: 0.86, duration: 0.6, ease: E }, T.o2.s - 0.2);
tl.fromTo(".barrow", { opacity: 0, x: -600 }, { opacity: 1, x: 0, duration: 0.6, ease: E }, T.o2.s);
tl.to(".barrow", { opacity: 0, y: 40, duration: 0.35 }, T.cta.s - 0.1);
tl.fromTo(".cta-wrap", { opacity: 0, y: 120 }, { opacity: 1, y: 0, duration: 0.6, ease: B }, T.cta.s);
tl.to(".cta", { scale: 1.06, duration: 0.45, yoyo: true, repeat: 7, ease: "sine.inOut" }, T.cta.s + 0.6);
tl.fromTo(".arrow", { y: -10 }, { y: 18, duration: 0.4, yoyo: true, repeat: 9, ease: "sine.inOut" }, T.cta.s + 0.4);

// Sous-titres : entrée de chaque bloc
document.querySelectorAll(".cap").forEach((c) => tl.fromTo(c, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.18, ease: E }, Number(c.dataset.start)));

window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
`;

// ---------------------------------------------------------------- page
const css = fs.readFileSync(path.join(here, "style.css"), "utf8");
const html = `<!doctype html>
<!-- Généré par build.mjs : ne pas modifier à la main (modifier script.json, style.css ou build.mjs). -->
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${W}, height=${H}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
${css}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}" data-fps="30">
<div class="bg"></div>
${scAccroche}${scCatalogue}${scPlan}${scDevis}${scTerrain}${scClarte}${scTemoignages}
${tvideos}
${scNouveaux}${scOffre}
<img id="logo" src="media/logo.png" alt="WOOPLANS">
<div id="progress"><i></i></div>
<div class="caps">
${captions.map((c, i) => `<div class="cap clip${c.quote ? " q" : ""}" data-start="${c.s}" data-duration="${c.d}" data-track-index="10"><span>${c.html}</span></div>`).join("\n")}
</div>
${voice}
${renaud ? `<audio id="a-${renaud.id}" class="clip" src="media/temoignages/${renaud.id}.wav" data-start="${T[renaud.id].s}" data-duration="${r2(T[renaud.id].e - T[renaud.id].s)}" data-track-index="22"></audio>` : ""}
${music}
</div>
<script>${js}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(here, "index.html"), html);
fs.writeFileSync(path.join(here, "timeline.json"), JSON.stringify({ total: TOTAL, scenes: S, lines: T }, null, 2) + "\n");
console.log(`index.html : ${TOTAL.toFixed(1)} s, ${captions.length} sous-titres, scènes ${order.join(" → ")}`);
