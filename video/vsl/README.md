# VSL du Catalogue Premium (HyperFrames, motion design)

Vidéo de vente de la section héro de `/catalogue-premium` : 88 s, 4:5 (1080 × 1350), sous-titres incrustés.
Composée avec [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP, rendu image par image par Chrome puis ffmpeg).

## Déroulé

| Scène | Voix off (Gradium, voix `TsRKBRWZGYldAeEI`) | Motion design |
|---|---|---|
| Accroche | Besoin d'inspiration ? Comparer plans et devis de près de 100 modèles | Mur de rendus 3D qui défile, « Plans + Devis », compteur jusqu'à 100 |
| Catalogue | Nous avons créé le Catalogue Premium, nos meilleurs modèles réunis | Titre or « Premium », téléphone qui défile, rendus qui s'y rangent |
| Plan / Devis / Terrain | Plan de distribution, devis poste par poste, terrain nécessaire | Vrai plan coté de la V3-001, ses 8 postes de devis et son total, terrain 12 × 20 m (250 m²) |
| Clarté | Avant de vous engager, une idée claire et précise | Rendu de la V3-001, budget 10,6 – 13 M FCFA, ✓ Plan ✓ Devis ✓ Terrain |
| Témoignages | « Ceux qui ont déjà obtenu le catalogue peuvent en témoigner » | Extraits réels : Ibrahim, Mamadou Bassirou, Francis (vidéo), Renaud (audio) |
| Nouveaux plans | Accès gratuit aux nouveaux plans | Grille de modèles « Nouveau », tampon « Gratuit à vie » |
| Offre | Prix promotionnel de 29 000 FCFA aujourd'hui, moins qu'une brouette | 60 000 FCFA barré, 29 000 FCFA, –52 %, brouette, bouton « Obtenir le catalogue » |

Musique : mixkit « Let's Play Africa » (licence libre mixkit), baissée pendant les témoignages.

## Fichiers

| Fichier | Rôle |
|---|---|
| `script.json` | Texte de la voix off (prononcé et sous-titré), extraits des témoignages (début / fin, sous-titre), données du modèle de démonstration, prix. |
| `timings.json` | Durée réelle de chaque phrase (écrite par `voice.mjs`) : tout le minutage en découle. |
| `build.mjs`, `style.css` | Génèrent `index.html`, la composition HyperFrames (ne pas modifier `index.html` à la main). `timeline.json` : minutage calculé. |
| `prepare.mjs` | Télécharge dans `media/` (non versionné) les témoignages publiés sur le site et les découpe, les rendus de couverture, la photo de Renaud, la musique. |
| `voice.mjs` | Voix off Gradium, une phrase par appel (`GRADIUM_API_KEY`), réutilise les phrases inchangées. |
| `finish.mjs` | Fichiers livrés dans `out/` : vidéo 720 × 900 (≈ 7,7 Mo), aperçu muet de 6 s (0,3 Mo), image d'attente. |

Le prix vient de `src/config/catalogue.json` (`price`, `priceBefore`) : `lib.mjs` refuse de construire si `script.json` ne correspond plus (la voix dit le prix : la regénérer).

Médias Premium de la V3-001 à déposer à la main dans `media/showcase/` (outil MCP wooplans `get_plan_file`) : `plan.webp` (distribution cotée) et `facade.png` (rendu original).

## Commandes

```sh
cd video/vsl && npm install
node prepare.mjs                      # médias (+ déposer media/showcase/plan.webp et facade.png)
GRADIUM_API_KEY=… node voice.mjs      # voix off → timings.json
node build.mjs                        # index.html
npx hyperframes lint .                # 0 erreur attendu
npx hyperframes snapshot --at 2.5,13,22,44,82   # images clés à regarder
npx hyperframes render -q delivery -w 4 -o out/vsl-master.mp4   # ≈ 2 min 30
node finish.mjs                       # fichiers livrés
```

## Mise en ligne

Les vidéos sont servies depuis le bucket R2 `cpbook-videos` par `/videos/<clé>.mp4`, avec un cache immuable : une nouvelle version prend une nouvelle clé.

```sh
npx wrangler r2 object put cpbook-videos/vsl-catalogue-premium-v2.mp4 --file out/vsl-catalogue-premium.mp4 --content-type video/mp4 --remote
npx wrangler r2 object put cpbook-videos/vsl-catalogue-premium-apercu-v2.mp4 --file out/vsl-catalogue-premium-apercu.mp4 --content-type video/mp4 --remote
```

L'image d'attente est `public/assets/digital/vsl-poster-v2.webp` (copie de `out/vsl-poster.webp`).
