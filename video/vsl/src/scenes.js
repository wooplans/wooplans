// Scènes de la VSL. Chaque image est une fonction pure du temps : renderFrame(t)
// place tous les éléments pour l'instant t, ce qui rend le rendu image par image
// reproductible. Modes : "main" (vidéo complète), "preview" (aperçu muet de 6 s),
// "poster" (image d'aperçu).

(function () {
  const TL = window.VSL_TIMELINE;
  const SC = TL.build(window.VSL_TIMINGS);
  const byId = Object.fromEntries(SC.map((s) => [s.id, s]));
  const at = (id, phrase) => TL.at(byId[id], phrase);
  const IMG = "../../../public/assets/";

  // --- Outils d'animation -------------------------------------------------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, a, d = 0.5) => cl((t - a) / d);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, x) => a + (b - a) * x;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  function tf(el, { o, x = 0, y = 0, s = 1, r = 0 }) {
    if (!el) return;
    if (o !== undefined) el.style.opacity = o;
    el.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;
  }
  // Apparition : fondu + glissement vers le haut.
  function rise(el, t, a, d = 0.5, dist = 40) {
    const p = eo(prog(t, a, d));
    tf(el, { o: p, y: (1 - p) * dist });
    return p;
  }
  // Apparition avec rebond.
  function pop(el, t, a, d = 0.45, from = 0.5) {
    const p = prog(t, a, d);
    tf(el, { o: cl(p * 2), s: lerp(from, 1, back(p)) });
    return p;
  }
  // Disparition (fondu vers le haut).
  function leave(el, t, a, d = 0.4) {
    const p = eio(prog(t, a, d));
    if (p > 0) tf(el, { o: 1 - p, y: -30 * p });
    return p;
  }
  const fmt = (n) => Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");

  // --- Construction des scènes -------------------------------------------
  const root = $("#scenes");
  const scenes = {};
  function scene(id, html) {
    const el = document.createElement("div");
    el.className = "scene";
    el.innerHTML = html;
    root.appendChild(el);
    scenes[id] = el;
    return el;
  }

  const CHECK = '<svg viewBox="0 0 24 24" width="46" height="46"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#06302F" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9z"/></svg>';

  // Feuille de route (fil conducteur)
  const ROAD_X = [150, 500, 850];
  const ROAD_L = [["Choisir", "maison + budget"], ["Plans complets", "pour construire"], ["Construire", "le chantier"]];
  $("#road").innerHTML = '<div class="track"></div><div class="fill"></div>' + ROAD_X.map((x, i) =>
    `<div class="node" style="left:${x}px"><div class="glow"></div><span class="num">${i + 1}</span><span class="chk">${CHECK}</span></div>` +
    `<div class="nlabel" style="left:${x}px">${ROAD_L[i][0]}<span class="nsub">${ROAD_L[i][1]}</span></div>`).join("");

  // 1. Accroche
  scene("s01-accroche", `
    <div class="abs c h1" id="q1" style="top:200px">Vous voulez construire<br>votre maison ?</div>
    <svg class="abs" id="sac" viewBox="0 0 260 300" style="left:410px;top:430px;width:260px;height:300px">
      <path d="M30 40 Q130 10 230 40 L245 270 Q130 295 15 270 Z" fill="#D9D2C3" stroke="#8d8576" stroke-width="5"/>
      <path d="M30 40 Q130 10 230 40 L232 70 Q130 45 28 70 Z" fill="#bfb6a5"/>
      <rect x="55" y="110" width="150" height="90" rx="10" fill="#0F5B59"/>
      <text x="130" y="152" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="30" fill="#fff">CIMENT</text>
      <text x="130" y="186" text-anchor="middle" font-family="Jakarta" font-weight="700" font-size="24" fill="#E7C36C">50 kg</text>
    </svg>
    <div class="abs c h2 gold" id="trois" style="top:1000px">3 étapes avant</div>
    <svg class="abs" id="crack" viewBox="0 0 1000 120" style="left:40px;top:560px;width:1000px;height:120px">
      <path d="M520 0 L490 40 L540 62 L470 120" fill="none" stroke="#C75B3A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="abs c" id="stop" style="top:1000px"><span class="tag" style="background:#C75B3A;font-size:40px">Chantier arrêté</span></div>
  `);

  // 2. Problème
  const PROB = [
    ["Budget dépassé", `<svg viewBox="0 0 120 120"><rect x="22" y="12" width="64" height="92" rx="8" fill="#fff"/><path d="M34 34h40M34 50h40M34 66h26" stroke="#9aa7a6" stroke-width="6" stroke-linecap="round"/><path d="M70 98 L98 62 M98 62 h-20 M98 62 v20" stroke="#C75B3A" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`],
    ["Plans changés en plein chantier", `<svg viewBox="0 0 120 120"><rect x="14" y="18" width="92" height="84" rx="6" fill="#EAF2FF"/><path d="M26 32h68v56H26zM60 32v30H26M60 62h34" stroke="#3E5C8A" stroke-width="4" fill="none"/><path d="M22 22 L98 98 M98 22 L22 98" stroke="#C75B3A" stroke-width="11" stroke-linecap="round"/></svg>`],
    ["Maisons inachevées", `<svg viewBox="0 0 120 120"><path d="M18 100V52h84v48z" fill="#b9b2a4"/><path d="M18 52 l8-6 l8 6 l8-7 l8 7 l8-5 l8 5 l8-7 l8 7 l8-6 l8 6 l4-3" fill="none" stroke="#8d8576" stroke-width="4"/><rect x="34" y="66" width="18" height="34" fill="#4b4a45"/><rect x="66" y="66" width="22" height="18" fill="#4b4a45"/><path d="M24 52v-22M44 52v-26M96 52v-18" stroke="#6b6b6b" stroke-width="4"/><path d="M10 102h100" stroke="#C75B3A" stroke-width="6"/></svg>`],
  ];
  scene("s02-probleme", PROB.map((p, i) => `
    <div class="abs prob" style="left:90px;right:90px;top:${250 + i * 255}px;height:220px;border-radius:30px;background:rgba(4,30,29,.55);border:3px solid rgba(199,91,58,.6);display:flex;align-items:center;gap:34px;padding:0 40px">
      <div style="width:160px;height:160px;flex:none">${p[1]}</div>
      <div class="h3" style="font-size:46px;font-weight:800">${p[0]}</div>
    </div>`).join("") + `<div class="abs c h2" id="partout" style="top:1020px;font-size:50px">On le voit <span class="red">partout.</span></div>`);

  // 3. Feuille de route
  scene("s03-feuille-de-route", `
    <div class="abs c kick" id="rm-k" style="top:300px">Avec WOOPLANS</div>
    <div class="abs c h1" id="rm-t" style="top:350px">Un parcours clair</div>
  `);

  // 4. Étape 1 : enregistrement d'écran réel de l'espace Premium (fiche D4-040)
  // dans un cadre de téléphone. Images extraites par render.mjs dans out/ecran/frames.
  const REC_FPS = 30;
  scene("s04-etape-1", `
    <div class="phone" id="ph" style="left:56px;top:212px">
      <div class="screen"><img id="rec" style="width:100%;height:100%;object-fit:cover;object-position:50% 0;display:block"></div>
    </div>
    <div class="abs" id="s4-right" style="left:530px;top:250px;width:500px">
      <div class="kick" id="s4-k">Étape 1</div>
      <div class="h2" id="s4-t" style="font-size:60px;margin:6px 0 34px">Catalogue<br>Premium</div>
      <div id="s4-n" style="display:flex;align-items:baseline;gap:14px;margin-bottom:30px"><span class="gold" style="font-size:96px;font-weight:800;line-height:1">60+</span><span class="h3" style="font-size:34px">villas<br>et duplex</span></div>
      <div class="feat" id="f1"><i></i>Rendus 3D</div>
      <div class="feat" id="f2"><i></i>Plans cotés</div>
      <div class="feat" id="f3"><i></i>Surface des pièces</div>
      <div class="feat" id="f4"><i></i>Devis poste par poste</div>
    </div>
    <div class="abs" id="s4-ex" style="left:530px;top:270px;width:500px">
      <div class="kick">Exemple</div>
      <div class="h2" style="font-size:64px;margin:6px 0 20px">Duplex D4-040</div>
      <div class="h3" id="ex-a" style="font-size:40px">4 chambres · 155 m²</div>
      <div id="ex-b" style="margin-top:46px">
        <div style="font-size:28px;font-weight:700;opacity:.85">Budget de construction</div>
        <div class="gold" style="font-size:74px;font-weight:800;letter-spacing:-.02em;line-height:1.1"><span id="cnt-a">25,1</span> – <span id="cnt-b">30,7</span> M</div>
        <div style="font-size:34px;font-weight:800">FCFA</div>
      </div>
      <div id="ex-c" class="h3" style="margin-top:46px;font-size:40px;font-weight:800">Vous comparez <span class="gold">avant</span> de dépenser.</div>
    </div>
  `);

  // 5. La précision
  scene("s05-precision", `
    <div class="abs c" id="att" style="top:236px"><span class="tag" style="background:#C75B3A;font-size:34px">Attention</span></div>
    <div class="panel" id="pa" style="left:46px;top:330px;border:5px solid var(--gold);background:rgba(4,30,29,.55)">
      <svg viewBox="0 0 120 120" width="150" height="150"><rect x="16" y="22" width="60" height="78" rx="8" fill="#E7C36C"/><path d="M28 44h36M28 58h36M28 72h22" stroke="#06302F" stroke-width="6" stroke-linecap="round"/><circle cx="78" cy="74" r="22" fill="none" stroke="#fff" stroke-width="8"/><path d="M94 90l14 14" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg>
      <div class="kick" style="margin-top:20px">Catalogue Premium</div>
      <div class="h1" style="margin:22px 0;font-size:84px">=&nbsp;choisir</div>
      <div class="h3" style="font-size:32px;opacity:.9">Comparer les modèles<br>et leur budget</div>
    </div>
    <div class="panel" id="pb" style="left:558px;top:330px;border:5px solid #fff;background:#fff;color:var(--ink)">
      <svg viewBox="0 0 120 120" width="150" height="150"><path d="M20 72a40 40 0 0 1 80 0z" fill="#0F5B59"/><rect x="12" y="70" width="96" height="14" rx="7" fill="#0F5B59"/><path d="M60 32v-10" stroke="#0F5B59" stroke-width="10" stroke-linecap="round"/><rect x="26" y="92" width="68" height="18" rx="4" fill="#E7C36C"/></svg>
      <div class="kick" style="margin-top:20px;color:var(--green)">Plans complets</div>
      <div class="h1" style="margin:22px 0;font-size:72px;color:var(--green)">=&nbsp;construire</div>
      <div class="h3" id="pb-s" style="font-size:32px">Adaptés à<br>votre terrain</div>
    </div>
  `);

  // 6. Étape 2 : 10 plans + calcul
  const S = 'stroke="#14302F" stroke-width="3" fill="none"';
  const FAC = (w) => `<path d="M14 120h128M24 120V60h108v60M18 62l60-36 60 36" ${S}/><rect x="${w}" y="80" width="22" height="40" ${S}/><rect x="40" y="76" width="22" height="18" ${S}/><rect x="96" y="76" width="22" height="18" ${S}/>`;
  const SHEETS = [
    ["Fondation", `<path d="M16 16h124v110H16zM16 70h124M78 16v110" ${S} stroke-dasharray="8 5"/><path d="M16 16h124v110H16z" ${S}/>`],
    ["Distribution", `<path d="M16 16h124v110H16zM16 66h60M76 16v110M76 80h64M110 16v64" ${S}/>`],
    ["Façade avant", FAC(66)],
    ["Façade arrière", FAC(30)],
    ["Façade gauche", `<path d="M14 120h128M30 120V64h96v56M24 66l54-34 54 34" ${S}/><rect x="64" y="80" width="28" height="22" ${S}/>`],
    ["Façade droite", `<path d="M14 120h128M30 120V64h96v56M24 66l54-34 54 34" ${S}/><rect x="44" y="80" width="22" height="40" ${S}/><rect x="90" y="80" width="22" height="22" ${S}/>`],
    ["Coupe AA", `<path d="M14 122h128M26 122V62h104v60M20 64l58-34 58 34M26 92h104" ${S}/><path d="M14 130h128" stroke="#C75B3A" stroke-width="3"/>`],
    ["Coupe BB", `<path d="M14 122h128M36 122V58h84v64M30 60l48-30 48 30M78 58v64" ${S}/><path d="M14 130h128" stroke="#C75B3A" stroke-width="3"/>`],
    ["Toiture", `<path d="M16 24h124v96H16zM16 24l40 48h44l40-48M16 120l40-48M100 72l40 48" ${S}/>`],
    ["Fosse septique", `<rect x="16" y="46" width="124" height="66" rx="10" ${S}/><path d="M60 46v66M100 46v66M8 60h8M140 98h10" ${S}/><path d="M22 80h32M66 86h28M106 92h28" stroke="#3E5C8A" stroke-width="3"/>`],
  ];
  scene("s06-etape-2", `
    <div class="abs c" id="s6-head" style="top:210px"><div class="kick">Étape 2</div><div class="h2" style="margin-top:6px">10 plans pour construire</div></div>
    <div id="sheets">${SHEETS.map((s, i) => `<div class="sheet" style="left:${48 + (i % 5) * 200}px;top:${400 + Math.floor(i / 5) * 250}px"><svg viewBox="0 0 156 146">${s[1]}</svg><p>${s[0]}</p></div>`).join("")}</div>
    <div class="abs c" id="perso" style="top:930px"><span class="tag" style="background:var(--gold);color:var(--deep);font-size:36px">Modifiés selon vos besoins</span></div>
    <div class="calc" id="calc" style="top:250px">
      <div class="kick" style="color:var(--green)">Prix fixe, connu d'avance</div>
      <div style="height:26px"></div>
      <div class="row"><div class="lbl">Villa</div><div class="eq"><span id="va">149 000</span> <span class="minus" id="vb">− 39 000</span> <span id="vc">= <b style="color:var(--green)">110 000</b></span></div></div>
      <div class="row"><div class="lbl">Duplex</div><div class="eq"><span id="da">249 000</span> <span class="minus" id="db">− 39 000</span> <span id="dc">= <b style="color:var(--green)">210 000</b></span></div></div>
      <div id="ded" style="font-size:30px;font-weight:700;color:#5d6b6a">FCFA · les 39 000 du catalogue sont déduits</div>
      <div class="stamp" id="stamp" style="right:34px;top:26px">PRIX FIXE</div>
    </div>
    <div class="abs c" id="zero" style="top:900px"><span class="tag" style="background:var(--gold);color:var(--deep);font-size:44px;padding:18px 36px">Catalogue = 0 F</span></div>
  `);

  // 7. Étape 3 : la maison se construit
  scene("s07-etape-3", `
    <div class="abs c" id="s7-head" style="top:220px"><div class="kick">Étape 3</div><div class="h2" style="margin-top:6px">Votre chantier démarre</div></div>
    <svg class="abs" id="house" viewBox="0 0 800 460" style="left:140px;top:400px;width:800px;height:460px">
      <path d="M20 430h760" stroke="rgba(255,255,255,.5)" stroke-width="6"/>
      <rect id="hf" x="90" y="400" width="620" height="30" fill="#9aa7a6"/>
      <g id="hw"><rect x="110" y="220" width="580" height="180" fill="#F1EADB"/>
        <rect x="170" y="270" width="80" height="70" fill="#3E5C6A"/><rect x="550" y="270" width="80" height="70" fill="#3E5C6A"/><rect x="365" y="280" width="70" height="120" fill="#7A4E2D"/></g>
      <path id="hr" d="M70 230 L400 70 L730 230 Z" fill="#6B4F3A"/>
    </svg>
    <div class="vframe" id="render" style="left:90px;top:400px;width:900px;height:520px"><img src="../assets/d4-040-cover.webp" style="width:100%;height:100%;object-fit:cover"></div>
    <div class="abs c" id="s7-tag" style="top:950px"><span class="tag" style="background:rgba(4,30,29,.7);border:3px solid var(--gold);font-size:34px">Plans + devis en main</span></div>
  `);

  // 8. Preuve : extrait vidéo réel de Francis, témoignage audio de Renaud
  // (images de Francis extraites dans out/temoignages/francis par render.mjs).
  const NAME = (n) => `<div style="position:absolute;left:0;right:0;bottom:0;padding:26px 30px;background:linear-gradient(0deg,rgba(0,0,0,.75),rgba(0,0,0,0))"><div style="font-weight:800;font-size:40px">${n}</div><div style="font-weight:600;font-size:24px;color:var(--gold)">Client WOOPLANS</div></div>`;
  const BARS = Array.from({ length: 21 }, (_, i) => `<i style="display:inline-block;width:12px;margin:0 4px;border-radius:6px;background:var(--gold);height:20px;vertical-align:middle" data-i="${i}"></i>`).join("");
  scene("s08-preuve", `
    <div class="vframe testi" id="v0" style="left:250px;top:200px;width:580px;height:860px">
      <img id="fr" style="width:100%;height:100%;object-fit:cover;display:block">${NAME("Francis")}
    </div>
    <div class="vframe testi" id="v1" style="left:250px;top:200px;width:580px;height:860px;background:linear-gradient(160deg,#164e4c,#0a1b1b)">
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;padding:0 40px 120px">
        <div style="font-size:150px;line-height:.6;font-weight:800;color:var(--gold)">“</div>
        <div id="bars" style="height:150px;display:flex;align-items:center">${BARS}</div>
        <div style="font-weight:700;font-size:26px;opacity:.75;letter-spacing:.08em;text-transform:uppercase">Témoignage audio</div>
      </div>${NAME("Renaud")}
    </div>`);

  // 9. Offre et garantie
  scene("s09-offre", `
    <div class="offer" id="offer" style="top:230px">
      <div class="kick" style="color:var(--green)">Catalogue Premium · étape 1</div>
      <div style="font-size:120px;font-weight:800;letter-spacing:-.03em;line-height:1.05;color:var(--green);margin:14px 0 0">39 000 <span style="font-size:52px">FCFA</span></div>
      <div style="font-size:30px;font-weight:700;color:#5d6b6a;margin-bottom:34px">Un seul paiement</div>
      <div class="feat" id="o1"><i></i>Accès immédiat</div>
      <div class="feat" id="o2"><i></i>À vie, nouveaux modèles inclus</div>
      <div class="feat" id="o3"><i></i>Déduit de vos plans complets</div>
    </div>
    <div class="seal" id="seal" style="left:700px;top:790px">
      <div style="font-size:30px;font-weight:800;line-height:1">Satisfait<br>ou remboursé</div>
      <div style="font-size:84px;font-weight:800;line-height:1">7</div>
      <div style="font-size:30px;font-weight:800">jours</div>
    </div>
    <div class="abs" id="wa" style="left:100px;top:880px;width:560px;font-size:32px;font-weight:700;line-height:1.3">Un simple message <span class="gold">WhatsApp</span> suffit.</div>
  `);

  // 10. Urgence : palier de 100 modèles
  scene("s10-urgence", `
    <div class="abs c" id="u-t" style="top:250px"><div class="kick">À 100 modèles</div><div class="h2" style="margin-top:8px">le prix change</div></div>
    <div class="abs" id="u-p" style="left:0;right:0;top:470px;display:flex;align-items:center;justify-content:center;gap:40px">
      <div style="text-align:center"><div style="font-size:28px;font-weight:700;opacity:.8">Aujourd'hui</div><div style="font-size:84px;font-weight:800">39 000</div></div>
      <svg viewBox="0 0 100 60" width="120" height="72"><path d="M6 30h76M62 10l22 20-22 20" stroke="#E7C36C" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="text-align:center" id="u-60"><div style="font-size:28px;font-weight:700;opacity:.8">À 100 modèles</div><div style="font-size:84px;font-weight:800;color:#F09A7E">60 000</div></div>
    </div>
    <div class="abs c" style="top:640px;font-size:34px;font-weight:700;opacity:.85" id="u-f">FCFA</div>
    <div class="abs c" id="u-c" style="top:780px"><span class="tag" style="background:rgba(4,30,29,.75);border:3px solid var(--gold);font-size:40px;padding:18px 34px">Compteur juste sous la vidéo</span>
      <svg viewBox="0 0 60 80" width="60" height="80" style="display:block;margin:18px auto 0" id="u-arrow"><path d="M30 6v60M10 46l20 22 20-22" stroke="#E7C36C" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  `);

  // 11. Appel à l'action
  const PAYS = [["Orange Money", "#000", "#FF7900"], ["MTN MoMo", "#FFCC00", "#003A5D"], ["Wave", "#1DC8FF", "#002B5C"], ["Moov Money", "#0055A5", "#fff"], ["Carte bancaire", "#fff", "#14302F"]];
  scene("s11-action", `
    <div class="abs c" id="a-t" style="top:280px"><div class="h2">Choisissez votre maison<br><span class="gold">dès aujourd'hui</span></div></div>
    <div class="abs c" id="a-pay" style="top:500px;padding:0 60px">${PAYS.map((p) => `<span class="pay" style="background:${p[1]};color:${p[2]}">${p[0]}</span>`).join("")}</div>
    <div class="abs c" id="a-cta" style="top:730px"><span class="cta">${LOCK}Obtenir le catalogue</span></div>
    <svg class="abs" id="a-arrow" viewBox="0 0 80 110" style="left:500px;top:900px;width:80px;height:110px"><path d="M40 8v80M12 62l28 32 28-32" stroke="#F08A2E" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <img class="abs" id="a-logo" src="${IMG}wooplans-logo-white.png" style="left:440px;top:186px;width:200px">
  `);

  // --- Feuille de route : état selon le temps -----------------------------
  // y, échelle, opacité, étiquettes ; lit[i] (allumé), done[i] (validé), fill (0..1).
  const DOCK = { y: 22, s: 0.78, o: 1, lab: 1 };
  function dockState(k) {
    return { ...DOCK, lit: [0, 1, 2].map((i) => (i <= k ? 1 : 0)), done: [0, 1, 2].map((i) => (i < k ? 1 : 0)), fill: [0, 0.5, 1][k], cur: k };
  }
  function roadState(id, lt, sc) {
    switch (id) {
      case "s01-accroche": {
        const a = at(id, "Avant");
        const p = eo(prog(lt, a + 0.2, 1.0));
        return { y: 610, s: 1, o: prog(lt, a, 0.3), lab: 0, draw: p, lit: [0, 0, 0], done: [0, 0, 0], fill: 0, cur: -1 };
      }
      case "s02-probleme": return { y: 610, s: 1, o: 0, lab: 0, lit: [0, 0, 0], done: [0, 0, 0], fill: 0, cur: -1 };
      case "s03-feuille-de-route": {
        const ts = [at(id, "Un :"), at(id, "Deux"), at(id, "Trois")];
        const lit = ts.map((x) => eo(prog(lt, x, 0.35)));
        const fill = lit[2] ? lerp(0.5, 1, eo(prog(lt, ts[2] - 0.3, 0.4))) * (lit[1] > 0) : 0;
        const fill2 = Math.max(lit[1] ? 0.5 * eo(prog(lt, ts[1] - 0.3, 0.4)) : 0, fill);
        const big = { y: 560, s: 1.02, o: 1, lab: 1, lit, done: [0, 0, 0], fill: fill2, cur: -1 };
        const m = eio(prog(lt, sc.dur - 0.7, 0.7));
        if (m <= 0) return big;
        return mix(big, dockState(0), m);
      }
      case "s04-etape-1": case "s05-precision": case "s09-offre": case "s10-urgence": case "s11-action": return dockState(0);
      case "s06-etape-2": return dockState(1);
      case "s07-etape-3": return dockState(2);
      case "s08-preuve": return { ...dockState(2), done: [1, 1, 1], o: 0.0 };
    }
  }
  function mix(a, b, m) {
    const o = {};
    for (const k of Object.keys(b)) {
      if (Array.isArray(b[k])) o[k] = b[k].map((v, i) => lerp(a[k][i], v, m));
      else if (typeof b[k] === "number") o[k] = lerp(a[k] ?? b[k], b[k], m);
      else o[k] = b[k];
    }
    o.draw = 1;
    o.cur = m < 0.5 ? a.cur : b.cur;
    return o;
  }
  function drawRoad(st, t) {
    const road = $("#road");
    road.style.top = st.y + "px";
    road.style.transform = `scale(${st.s})`;
    road.style.opacity = st.o;
    const draw = st.draw ?? 1;
    $(".track", road).style.width = 700 * draw + "px";
    $(".fill", road).style.width = 700 * st.fill + "px";
    $$(".node", road).forEach((n, i) => {
      const appear = cl((draw * 700 - (ROAD_X[i] - 150)) / 60 + 1);
      const L = st.lit[i], D = st.done[i];
      n.style.opacity = appear;
      n.style.transform = `scale(${0.6 + 0.4 * appear + 0.12 * L * (1 - D)})`;
      n.style.background = L > 0.01 ? `rgba(231,195,108,${0.15 + 0.85 * L * (1 - D * 0.35)})` : "#06302F";
      n.style.borderColor = L > 0.01 ? `rgba(231,195,108,${0.35 + 0.65 * L})` : "rgba(255,255,255,.35)";
      n.style.color = L > 0.5 ? "#06302F" : "rgba(255,255,255,.55)";
      const pulse = i === st.cur ? 0.6 + 0.4 * Math.sin(t * 4) : 0;
      $(".glow", n).style.opacity = L * (1 - D) * (0.5 + 0.5 * pulse);
      $(".num", n).style.opacity = 1 - D;
      $(".chk", n).style.opacity = D;
      const lab = $$(".nlabel", road)[i];
      lab.style.opacity = st.lab * appear;
      lab.style.color = L > 0.5 ? (D > 0.5 ? "rgba(255,255,255,.8)" : "#E7C36C") : "rgba(255,255,255,.55)";
      $(".nsub", lab).style.display = st.s > 0.9 ? "block" : "none";
    });
  }

  // --- Animations de chaque scène -----------------------------------------
  const UPDATE = {
    "s01-accroche"(lt, sc) {
      const id = sc.id;
      const fall = prog(lt, 0.05, 0.55);
      const y = fall < 1 ? -620 * Math.pow(1 - fall, 2) : 0;
      const squash = fall >= 1 ? Math.max(0, 1 - (lt - 0.6) * 5) : 0;
      const sauter = at(id, "Les sauter");
      const shake = lt > sauter ? Math.sin(lt * 40) * 6 * Math.max(0, 1 - (lt - sauter) * 1.5) : 0;
      const shrink = eio(prog(lt, at(id, "Avant") - 0.1, 0.7));
      tf($("#sac"), { o: 1, x: shake, y: y + lerp(0, -170, shrink) + squash * 14, s: lerp(1, 0.62, shrink) * (1 + squash * 0.06) });
      rise($("#q1"), lt, 0.25, 0.5);
      leave($("#q1"), lt, at(id, "Avant") - 0.1);
      const tr = rise($("#trois"), lt, at(id, "trois étapes"), 0.45);
      if (tr > 0) leave($("#trois"), lt, sauter - 0.1, 0.3);
      const cr = prog(lt, sauter + 0.2, 0.25);
      $("#crack").style.opacity = cr;
      $("#crack path").style.strokeDasharray = 300;
      $("#crack path").style.strokeDashoffset = 300 * (1 - cr);
      pop($("#stop"), lt, sauter + 0.35);
    },
    "s02-probleme"(lt, sc) {
      const ts = [0, at(sc.id, "plans changés"), at(sc.id, "maisons")];
      $$(".prob", scenes[sc.id]).forEach((el, i) => {
        const p = prog(lt, ts[i], 0.3);
        const shake = p >= 1 ? Math.sin((lt - ts[i]) * 50) * 8 * Math.max(0, 1 - (lt - ts[i] - 0.3) * 4) : 0;
        tf(el, { o: cl(p * 2), s: lerp(1.35, 1, eo(p)), x: shake });
      });
      rise($("#partout"), lt, at(sc.id, "on le voit"), 0.4);
    },
    "s03-feuille-de-route"(lt, sc) {
      rise($("#rm-k"), lt, 0.1);
      rise($("#rm-t"), lt, 0.25);
      leave($("#rm-k"), lt, sc.dur - 0.8);
      leave($("#rm-t"), lt, sc.dur - 0.8);
    },
    "s04-etape-1"(lt, sc) {
      const id = sc.id;
      const ex = at(id, "Exemple"), ch = at(id, "quatre chambres"), en = at(id, "entre"), cmp = at(id, "Vous comparez");
      const ph = eo(prog(lt, 0, 0.6));
      tf($("#ph"), { o: ph, x: (1 - ph) * -80 });
      // Montage de l'enregistrement (secondes de la vidéo source), calé sur la voix :
      // grille → rendus → distributions cotées → pièces → devis → budget de la fiche.
      const r = at(id, "rendus"), pc = at(id, "plans cotés"), su = at(id, "surfaces"), dv = at(id, "devis poste");
      const cuts = [[0, r - 0.2, 2.0, 7.3], [r - 0.2, pc - 0.1, 14.0, 16.0], [pc - 0.1, su - 0.1, 18.6, 26.6],
        [su - 0.1, dv - 0.1, 27.8, 30.2], [dv - 0.1, ex, 31.0, 34.3], [ex, 1e9, 15.4, 16.4, "play"]];
      const seg = cuts.find((k) => lt < k[1]) || cuts[cuts.length - 1];
      const src = seg[4] === "play" ? Math.min(seg[3], seg[2] + (lt - seg[0])) : lerp(seg[2], seg[3], cl((lt - seg[0]) / (seg[1] - seg[0])));
      const n = String(Math.max(1, Math.round(src * REC_FPS) + 1)).padStart(4, "0");
      const img = $("#rec"), url = `../out/ecran/frames/f${n}.jpg`;
      if (img.getAttribute("src") !== url) { img.setAttribute("src", url); pending.push(img.decode().catch(() => {})); }
      // Colonne de droite
      rise($("#s4-k"), lt, 0.2); rise($("#s4-t"), lt, 0.3);
      rise($("#s4-n"), lt, at(id, "Plus de"));
      rise($("#f1"), lt, at(id, "rendus")); rise($("#f2"), lt, at(id, "plans cotés"));
      rise($("#f3"), lt, at(id, "surfaces")); rise($("#f4"), lt, at(id, "devis poste"));
      const out = eio(prog(lt, ex - 0.15, 0.4));
      $("#s4-right").style.opacity = 1 - out;
      const inn = eo(prog(lt, ex + 0.1, 0.45));
      tf($("#s4-ex"), { o: inn, y: (1 - inn) * 40 });
      rise($("#ex-a"), lt, ch); rise($("#ex-b"), lt, en);
      const c = eo(prog(lt, en + 0.1, 1.3));
      $("#cnt-a").textContent = (25.1 * c).toFixed(1).replace(".", ",");
      $("#cnt-b").textContent = (30.7 * c).toFixed(1).replace(".", ",");
      rise($("#ex-c"), lt, cmp);
    },
    "s05-precision"(lt, sc) {
      pop($("#att"), lt, 0.05);
      const a = rise($("#pa"), lt, at(sc.id, "le catalogue"), 0.5, 60);
      rise($("#pb"), lt, at(sc.id, "Pour construire"), 0.5, 60);
      rise($("#pb-s"), lt, at(sc.id, "adaptés"), 0.4, 20);
      return a;
    },
    "s06-etape-2"(lt, sc) {
      const id = sc.id;
      const prix = at(id, "Prix fixe"), dup = at(id, "deux cent"), ded = at(id, "et les trente"), zero = at(id, "il vous revient");
      rise($("#s6-head"), lt, 0.05);
      const span = Math.max(1.5, at(id, "modifiés") - 0.4);
      $$(".sheet", scenes[id]).forEach((el, i) => {
        const p = prog(lt, 0.3 + (i * span) / 10, 0.35);
        const gather = eio(prog(lt, at(id, "modifiés") - 0.1, 0.6));
        const x0 = 48 + (i % 5) * 200, y0 = 400 + Math.floor(i / 5) * 250;
        const dx = (452 - x0) * gather + (i - 4.5) * 4 * gather, dy = (500 - y0) * gather - i * 3 * gather;
        tf(el, { o: cl(p * 2), x: dx, y: dy + (1 - eo(p)) * -60, s: lerp(1.25, 1, eo(p)) * lerp(1, 1.25, gather), r: (1 - eo(p)) * 8 + gather * (i - 4.5) * 1.6 });
      });
      pop($("#perso"), lt, at(id, "modifiés"));
      const outA = eio(prog(lt, prix - 0.35, 0.4));
      for (const sel of ["#s6-head", "#sheets", "#perso"]) if (outA > 0) $(sel).style.opacity = 1 - outA;
      const card = eo(prog(lt, prix - 0.15, 0.45));
      tf($("#calc"), { o: card, y: (1 - card) * 60 });
      rise($("#va"), lt, prix + 0.4, 0.4, 20);
      rise($("#da"), lt, dup, 0.4, 20);
      rise($("#vb"), lt, ded, 0.35, 20); rise($("#db"), lt, ded + 0.15, 0.35, 20);
      rise($("#vc"), lt, ded + 0.7, 0.35, 20); rise($("#dc"), lt, ded + 0.85, 0.35, 20);
      rise($("#ded"), lt, ded + 1.0, 0.35, 10);
      const st = prog(lt, prix + 0.5, 0.3);
      tf($("#stamp"), { o: cl(st * 2), s: lerp(2.2, 1, eo(st)), r: -10 });
      pop($("#zero"), lt, zero);
    },
    "s07-etape-3"(lt, sc) {
      const d = sc.dur;
      rise($("#s7-head"), lt, 0.05);
      const f = eo(prog(lt, 0.25, 0.5)), w = eo(prog(lt, 0.25 + d * 0.12, d * 0.18)), r = back(prog(lt, 0.25 + d * 0.32, 0.45));
      $("#hf").style.transform = `scaleY(${f})`; $("#hf").style.transformOrigin = "0 430px";
      $("#hw").style.transform = `scaleY(${w})`; $("#hw").style.transformOrigin = "0 400px"; $("#hw").style.opacity = w > 0 ? 1 : 0;
      $("#hr").style.opacity = cl(r * 3); $("#hr").style.transform = `translateY(${(1 - r) * -120}px)`;
      const rd = eo(prog(lt, d * 0.55, 0.6));
      tf($("#render"), { o: rd, s: lerp(0.92, 1, rd) });
      $("#render img").style.transform = `scale(${1.05 + 0.05 * prog(lt, d * 0.55, d)})`;
      pop($("#s7-tag"), lt, 0.6);
    },
    "s08-preuve"(lt, sc) {
      const sw = sc.cues[1].start;
      const a = eo(prog(lt, 0, 0.45)), b = eo(prog(lt, sw - 0.2, 0.45));
      tf($("#v0"), { o: a * (1 - b), s: lerp(0.94, 1, a), x: -200 * b });
      tf($("#v1"), { o: b, x: (1 - b) * 200 });
      const n = String(Math.min(150, Math.max(1, Math.round(lt * 30) + 1))).padStart(4, "0");
      const img = $("#fr"), url = `../out/temoignages/francis/f${n}.jpg`;
      if (img.getAttribute("src") !== url) { img.setAttribute("src", url); pending.push(img.decode().catch(() => {})); }
      // Barres animées pendant la voix de Renaud (pseudo-aléatoires, reproductibles).
      $$("#bars i").forEach((el, i) => {
        const v = Math.abs(Math.sin(lt * 9.1 + i * 1.7) * Math.cos(lt * 5.3 + i * 0.9));
        el.style.height = 20 + 120 * v * Math.sin((Math.PI * (i + 1)) / 22) + "px";
      });
    },
    "s09-offre"(lt, sc) {
      const id = sc.id;
      const o = eo(prog(lt, 0.05, 0.5));
      tf($("#offer"), { o, y: (1 - o) * 60 });
      rise($("#o1"), lt, at(id, "accès immédiat"), 0.35, 20);
      rise($("#o2"), lt, at(id, "et à vie"), 0.35, 20);
      rise($("#o3"), lt, at(id, "et à vie") + 0.6, 0.35, 20);
      const s = prog(lt, at(id, "Satisfait"), 0.45);
      tf($("#seal"), { o: cl(s * 2), s: lerp(1.8, 1, back(s)), r: lerp(-30, -8, eo(s)) });
      rise($("#wa"), lt, at(id, "Satisfait") + 0.5, 0.4, 20);
    },
    "s10-urgence"(lt, sc) {
      rise($("#u-t"), lt, 0.05);
      rise($("#u-p"), lt, 0.3);
      rise($("#u-f"), lt, 0.5);
      const c = at(sc.id, "Le compteur");
      rise($("#u-c"), lt, c);
      $("#u-arrow").style.transform = `translateY(${Math.abs(Math.sin((lt - c) * 5)) * 16}px)`;
    },
    "s11-action"(lt, sc) {
      const id = sc.id;
      pop($("#a-cta"), lt, 0.05, 0.5, 0.7);
      const b = 1 + 0.035 * Math.sin(lt * 6);
      if (lt > 0.6) $("#a-cta").style.transform = `scale(${b})`;
      rise($("#a-pay"), lt, at(id, "payez"));
      rise($("#a-t"), lt, at(id, "et choisissez"));
      $("#a-arrow").style.opacity = prog(lt, 0.4, 0.3);
      $("#a-arrow").style.transform = `translateY(${Math.abs(Math.sin(lt * 4.5)) * 26}px)`;
      $("#a-logo").style.opacity = prog(lt, at(id, "et choisissez") + 0.8, 0.5);
    },
  };

  // --- Rendu d'une image ---------------------------------------------------
  const FADE = 0.3;
  let pending = [];
  const subsEl = $("#subs span");
  function renderScenes(t, opts) {
    $("#grid").style.transform = `translate(${(t * 6) % 60}px,${(t * 4) % 60}px)`;
    let road = null;
    for (const sc of SC) {
      const el = scenes[sc.id];
      const vis = cl((t - sc.start + FADE / 2) / FADE) * cl((sc.end + FADE / 2 - t) / FADE);
      el.style.opacity = vis;
      el.style.display = vis > 0 ? "block" : "none";
      if (vis > 0) UPDATE[sc.id](t - sc.start, sc);
      if (t >= sc.start && t < sc.end) {
        const lt = t - sc.start;
        road = roadState(sc.id, lt, sc);
        const i = SC.indexOf(sc);
        if (i > 0 && lt < 0.45 && sc.id !== "s03-feuille-de-route") road = mix(roadState(SC[i - 1].id, SC[i - 1].dur, SC[i - 1]), road, eio(lt / 0.45));
        // Sous-titres
        const cue = sc.cues.find((c) => lt >= c.start - 0.05 && lt < c.end + 0.25) || null;
        subsEl.parentNode.style.opacity = cue && opts.subs ? 1 : 0;
        if (cue) subsEl.innerHTML = cue.text.replace(/\s*\/\s*/g, "<br>");
      }
    }
    if (road) drawRoad(road, t);
  }

  const DURATION = SC[SC.length - 1].end;

  window.VSL = {
    duration: DURATION,
    scenes: SC,
    // Renvoie une promesse résolue quand les images de l'enregistrement sont décodées.
    renderFrame(t, mode = "main") {
      pending = [];
      this.draw(t, mode);
      return Promise.all(pending);
    },
    draw(t, mode) {
      if (mode === "main") {
        renderScenes(t, { subs: true });
        $("#banner").style.opacity = 0;
      } else if (mode === "preview") {
        // 6 s : la feuille de route s'allume (plan 3), puis le calcul (plan 6).
        const s3 = byId["s03-feuille-de-route"], s6 = byId["s06-etape-2"];
        let mt;
        if (t < 3.2) mt = s3.start + lerp(at(s3.id, "Un :") - 0.4, at(s3.id, "Trois") + 0.6, t / 3.2);
        else mt = s6.start + lerp(at(s6.id, "deux cent") - 0.5, at(s6.id, "et les trente") + 1.3, cl((t - 3.2) / 2.2));
        renderScenes(mt, { subs: false });
        $("#banner").style.opacity = 1;
        // Fondu au noir vert aux extrémités pour une boucle douce.
        const edge = Math.min(prog(t, 0, 0.25), 1 - prog(t, 5.75, 0.25));
        $("#scenes").style.opacity = edge; $("#road").style.opacity = parseFloat($("#road").style.opacity) * edge;
      } else if (mode === "poster") {
        const s3 = byId["s03-feuille-de-route"];
        renderScenes(s3.start + at(s3.id, "Un :") + 0.6, { subs: false });
        $("#rm-k").style.opacity = 0;
        const title = $("#rm-t");
        title.innerHTML = 'Peut-on construire<br><span class="gold">avec ces plans ?</span>';
        title.style.opacity = 1; title.style.transform = "none"; title.style.top = "190px";
        // Le centre reste libre pour le bouton lecture de la page.
        const k = $("#rm-k");
        k.textContent = "La réponse en 3 étapes"; k.style.opacity = 1; k.style.transform = "none"; k.style.top = "860px"; k.style.fontSize = "30px";
        $("#road").style.top = "930px";
        $("#banner").style.opacity = 0;
      }
    },
  };
})();
