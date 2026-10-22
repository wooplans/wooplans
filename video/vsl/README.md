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
| `voice.mjs` | Voix off Gradium (voix `TsRKBRWZGYldAeEI`), un appel par bloc de sous-titre, assemblée dans `out/voice.wav`. Lit `GRADIUM_API_KEY`. |
| `timings/voice.json` | (écrit par `voice.mjs`) durée réelle de chaque bloc ; l'animation et les sous-titres se recalent au rendu suivant. |
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
GRADIUM_API_KEY=… node voice.mjs --sample   # accroche seule, pour valider la voix
GRADIUM_API_KEY=… node voice.mjs            # voix complète, puis relancer render + assemble
```

Sans `out/voice.wav`, `assemble.mjs main` produit l'animatique muette. Avec la voix (et `audio/music.mp3` si présent), il produit la version finale : H.264 deux passes ≈ 1,15 Mb/s + AAC 96 kb/s, `faststart`.

## Médias réels (non versionnés, dans `out/`)

- `out/ecran/ecran.mp4` : enregistrement (1080 × 2400) d'écran de l'espace Premium (fiche Duplex D4-040), monté dans le téléphone du plan 4 et calé sur la voix (`cuts` dans `src/scenes.js`). Il affiche le prénom du compte : à garder hors du dépôt.
- `out/temoignages/francis.mp4` et `renaud.mp4` (téléchargés depuis `/videos/testimonials/`) : Francis 10,4–15,4 s (vidéo), Renaud 42,3–46,7 s (audio seul, carte animée). Repères trouvés par transcription.
- `assets/d4-040-cover.webp` : rendu 3D de D4-040 (plan 7).

`render.mjs` extrait les images de ces vidéos au premier rendu.
