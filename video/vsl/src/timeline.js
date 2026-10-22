// Texte de la voix off et minutage de la VSL, partagés par les scènes (navigateur)
// et par les scripts Node (sous-titres, voix).
//
// Chaque scène contient des blocs de sous-titres : [affiché, prononcé]. Le texte
// prononcé (nombres en toutes lettres) sert à la synthèse vocale et au minutage ;
// s'il est omis, c'est le texte affiché. Un « / » dans le texte affiché force le
// retour à la ligne du sous-titre (2 lignes au maximum).
//
// Sans voix enregistrée, le minutage est estimé (débit moyen + pauses de
// ponctuation). Quand une voix existe, timings/<scène>.json donne la durée réelle
// de chaque bloc et remplace l'estimation (voir voice.mjs).

(function (root) {
  const SCENES = [
    { id: "s01-accroche", lead: 0.3, tail: 0.3, subs: [
      ["Vous voulez construire / votre maison ?"],
      ["Avant le premier sac de ciment, / il y a trois étapes."],
      ["Les sauter, c'est risquer / un chantier qui s'arrête."],
    ] },
    { id: "s02-probleme", lead: 0.1, tail: 0.3, subs: [
      ["Budget dépassé,"],
      ["plans changés en plein chantier,"],
      ["maisons inachevées :"],
      ["on le voit partout."],
    ] },
    { id: "s03-feuille-de-route", lead: 0.1, tail: 0.5, subs: [
      ["Avec WOOPLANS, c'est clair."],
      ["Un : vous choisissez votre maison / et son budget."],
      ["Deux : vous obtenez vos plans complets."],
      ["Trois : vous construisez."],
    ] },
    { id: "s04-etape-1", lead: 0.2, tail: 0.4, subs: [
      ["Étape un : le Catalogue Premium."],
      ["Plus de 60 villas et duplex,", "Plus de soixante villas et duplex,"],
      ["avec rendus 3D, plans cotés, surfaces / et devis poste par poste."],
      ["Exemple : la villa V3-001,", "Exemple : la villa V3 zéro zéro un,"],
      ["trois chambres, 92 m²,", "trois chambres, quatre-vingt-douze mètres carrés,"],
      ["entre 10,6 et 13 millions de FCFA.", "entre dix virgule six et treize millions de francs CFA."],
      ["Vous comparez en famille, / avant de dépenser un franc."],
    ] },
    { id: "s05-precision", lead: 0.2, tail: 0.5, subs: [
      ["Attention : le catalogue sert à choisir."],
      ["Pour construire, il faut les plans complets, / adaptés à votre terrain."],
    ] },
    { id: "s06-etape-2", lead: 0.2, tail: 0.5, subs: [
      ["Étape deux : dix plans pour construire,"],
      ["de la fondation à la fosse septique, / modifiés selon vos besoins."],
      ["Prix fixe : 149 000 FCFA la villa,", "Prix fixe : cent quarante-neuf mille francs CFA la villa,"],
      ["249 000 le duplex,", "deux cent quarante-neuf mille le duplex,"],
      ["et les 39 000 du catalogue sont déduits :", "et les trente-neuf mille du catalogue sont déduits :"],
      ["il vous revient à zéro franc."],
    ] },
    { id: "s07-etape-3", lead: 0.2, tail: 0.6, subs: [
      ["Étape trois : plans et devis en main,"],
      ["vous lancez votre chantier / en sachant où vous allez."],
    ] },
    // Plan 8 : extraits réels des témoignages (durées des extraits vidéo).
    { id: "s08-preuve", lead: 0, tail: 0, fixed: [4.4, 6.2], subs: [
      ["« J'ai été très satisfait par la qualité / des devis et des plans. »"],
      ["« J'ai découvert ce site / et je vous le recommande fortement. »"],
    ] },
    { id: "s09-offre", lead: 0.2, tail: 0.4, subs: [
      ["Commencez par l'étape un :"],
      ["39 000 FCFA, une seule fois, / accès immédiat et à vie.", "trente-neuf mille francs CFA, une seule fois, accès immédiat et à vie."],
      ["Satisfait ou remboursé 7 jours.", "Satisfait ou remboursé sept jours."],
    ] },
    { id: "s10-urgence", lead: 0.2, tail: 0.3, subs: [
      ["À 100 modèles, le prix passera / à 60 000 FCFA.", "À cent modèles, le prix passera à soixante mille francs CFA."],
      ["Le compteur est juste sous la vidéo."],
    ] },
    { id: "s11-action", lead: 0.2, tail: 1.6, subs: [
      ["Touchez le bouton orange ci-dessous,"],
      ["payez par Orange Money, MTN, / Wave ou Moov,", "payez par Orange Money, M T N, Wave ou Moov,"],
      ["et choisissez votre maison / dès aujourd'hui."],
    ] },
  ];

  // Débit estimé d'une voix française posée (caractères prononcés par seconde).
  const CPS = 19.5;
  const PAUSES = { ",": 0.14, ":": 0.26, ";": 0.26, ".": 0.36, "?": 0.4, "!": 0.36 };

  function spoken(sub) {
    return (sub[1] || sub[0]).replace(/\s*\/\s*/g, " ");
  }

  function estimate(text) {
    const trimmed = text.trim();
    let d = trimmed.length / CPS;
    for (const ch of trimmed.slice(0, -1)) d += PAUSES[ch] || 0;
    return d + (PAUSES[trimmed.slice(-1)] || 0.12);
  }

  // timings : { [idScène]: { subs: [durée, …], gap?: n } } issus de la voix réelle.
  function build(timings) {
    timings = timings || {};
    let t = 0;
    return SCENES.map((scene) => {
      const real = timings[scene.id];
      const durs = scene.fixed || (real && real.subs) || scene.subs.map((s) => estimate(spoken(s)));
      let local = scene.lead;
      const cues = scene.subs.map((s, i) => {
        const cue = { text: s[0], spoken: spoken(s), start: local, end: local + durs[i] };
        local = cue.end;
        return cue;
      });
      const dur = local + scene.tail;
      const out = { id: scene.id, start: t, dur, end: t + dur, cues };
      t += dur;
      return out;
    });
  }

  // Instant (local à la scène) où commence un mot ou une expression de la voix.
  function at(scene, phrase) {
    for (const cue of scene.cues) {
      const i = cue.spoken.indexOf(phrase);
      if (i >= 0) return cue.start + (cue.end - cue.start) * (i / cue.spoken.length);
    }
    throw new Error("Expression introuvable dans " + scene.id + " : " + phrase);
  }

  const api = { SCENES, build, at, spoken, estimate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VSL_TIMELINE = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
