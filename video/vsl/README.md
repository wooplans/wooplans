# VSL du Catalogue Premium (motion design)

Vidéo de vente de la section héro de `/catalogue-premium`. Script de référence : `docs/vsl-catalogue-premium.md`.

Tout est produit en code, de façon reproductible : chaque image est une fonction pure du temps (`renderFrame(t)` dans `src/scenes.js`), rendue par Chromium puis assemblée par ffmpeg.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/timeline.js` | Texte de la voix off (affiché et prononcé), découpage en sous-titres, minutage. Source unique pour l'animation, les sous-titres et la voix. |
| `src/scenes.js`, `src/index.html` | Les 11 plans en HTML/CSS/SVG, la feuille de route en 3 étapes, les modes `main`, `preview` et `poster`. |
| `render.mjs` | Rendu image par image (Playwright + Chromium préinstallé) vers `out/`. |
| `assemble.mjs` | Voix + musique + compression aux poids visés, aperçu muet, poster. |
| `export-subs.mjs` | Sous-titres `out/vsl.srt` et `out/vsl.vtt` (incrustés dans la vidéo ; fichiers fournis en plus). |
| `timings/voice.json` | (après la voix) durée réelle de chaque bloc de sous-titre ; l'animation se recale automatiquement. |
| `fonts/` | Plus Jakarta Sans (licence OFL), sous-ensemble latin. |

`out/` (rendus) et `node_modules/` ne sont pas versionnés.

## Commandes

```sh
cd video/vsl && npm install          # playwright-core seulement, Chromium est préinstallé
node render.mjs --stills 2,20,40     # images clés pour vérifier une modification
node render.mjs                      # vidéo complète muette, 30 i/s (≈ 4 min)
node render.mjs --mode preview       # aperçu muet de 6 s
node render.mjs --mode poster        # image d'aperçu
node assemble.mjs main|preview|poster
node export-subs.mjs
```

Sans `out/voice.wav`, `assemble.mjs main` produit l'animatique muette. Avec la voix (et `audio/music.mp3` si présent), il produit la version finale : H.264 deux passes ≈ 1,15 Mb/s + AAC 96 kb/s, `faststart`.

## Éléments provisoires à remplacer

- **Téléphone du plan 4** (« maquette provisoire ») : à remplacer par l'enregistrement d'écran réel de l'espace Premium (grille → fiche V3-001 → rendus → plan coté → devis), incrusté dans le cadre du téléphone. Les chiffres affichés (pièces, devis par poste, total 11 776 000 FCFA, budget 10,6–13 M) sont ceux de la vraie fiche V3-001 ; les images sont des rendus génériques du dépôt et le plan coté est un schéma.
- **Plan 7** : rendu générique `house-model-01.webp`, à remplacer par un rendu de V3-001.
- **Plan 8** (« emplacement provisoire ») : extraits réels de Francis (00:11–00:15) et Renaud (00:43–00:49), à incruster dans les cadres.
