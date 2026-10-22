# VSL du Catalogue Premium (section héro de /catalogue-premium)

Remplace `/videos/vsl-cpbook-digital.mp4` (29 s, 16:9, avatar IA, logo Veo visible, livre papier « Édition 2024 », « 50 modèles », « télécharger », sans prix ni garantie).

## Ce que les données imposent

| Constat (PostHog, 30 jours) | Conséquence pour la vidéo |
|---|---|
| 11 % des visiteurs lancent la vidéo | La 1ʳᵉ image doit accrocher seule ; aperçu muet en boucle de 6 s, sous-titré |
| 46 % de ceux qui la voient cliquent « Obtenir » (10 % sans) | La vidéo est le meilleur vendeur de la page : elle mérite une vraie production |
| 59 % partent en 10 s | Accroche dans les 3 premières secondes, sans introduction ni logo |
| 17 ouvrent le paiement, 2 paient ; FAQ « Puis-je télécharger ? » la plus ouverte | La vidéo montre exactement ce qu'on reçoit et comment on paie |
| Visiteurs sur Android, données mobiles | Fichier léger (≤ 6 Mo), format 4:5, sous-titres incrustés (regardée sans le son) |

## Format

- **Durée :** 80 à 90 s (≈ 220 mots de voix off).
- **Cadre :** 4:5 (1080 × 1350). Remplit l'écran du téléphone sans le masquer entièrement ; le bloc `.vsl` passe de 16:9 à 4:5.
- **Sous-titres :** incrustés, 2 lignes maximum, gros caractères, zone basse sûre (au-dessus des commandes du lecteur).
- **Voix :** le fondateur ou un architecte de l'équipe, face caméra, filmé au téléphone. Une vraie personne : la vidéo actuelle perd en confiance parce qu'elle se voit générée par IA.
- **Poids :** H.264, 1080 × 1350, ≈ 1,2 Mb/s, AAC 96 kb/s → ≈ 6 Mo pour 85 s. Aperçu muet de 6 s ≤ 1 Mo.
- **Image d'aperçu (poster) :** visage + texte « Combien va vraiment coûter votre maison ? » + bouton lecture. Aucun logo d'outil.

## Script

Les valeurs entre crochets sont à confirmer par le propriétaire avant tournage.

| # | Temps | Voix off | À l'écran |
|---|---|---|---|
| 1. Accroche | 0–5 s | « Avant de poser la première brique… savez-vous combien va vraiment coûter votre maison ? » | Gros plan visage. Texte : **Combien va vraiment coûter votre maison ?** |
| 2. Problème | 5–15 s | « Beaucoup le découvrent en plein chantier. Le budget explose, les travaux s'arrêtent, et la maison reste inachevée pendant des années. » | Images de chantiers arrêtés, maisons inachevées (photos réelles libres de droits). Texte : **Budget dépassé. Chantier arrêté.** |
| 3. Cause | 15–22 s | « Le problème n'est pas l'argent. C'est de commencer sans plan précis et sans devis détaillé. » | Retour face caméra. Texte : **Sans plan ni devis, on construit à l'aveugle** |
| 4. Solution | 22–30 s | « C'est pour ça que nous avons créé le Catalogue Premium WOOPLANS : plus de 60 modèles de villas et de duplex, chacun avec son vrai devis. » | Écran du téléphone : la grille des modèles dans l'espace Premium, défilement. Texte : **60+ villas et duplex · Édition 2026** |
| 5. Démonstration | 30–50 s | « Regardez. Je choisis la villa V3-001 : trois chambres, 92 m². Je vois les rendus 3D, le plan coté de chaque pièce, et le devis poste par poste : fondation, élévations, toiture, carrelage… Budget estimé : entre 10,6 et 13 millions de FCFA. Je télécharge la fiche PDF à mon nom et je la montre à mon maçon. » | Enregistrement d'écran réel, plein cadre : fiche V3-001 → rendus → plan coté → devis → bouton « fiche PDF ». Zoom lisible sur les postes du devis. |
| 6. Preuve | 50–60 s | Extraits clients (voix des clients) | Témoignage Francis 00:11–00:15 : « J'ai été très satisfait par la qualité des devis et des plans. » Témoignage Renaud 00:43–00:49 : « J'ai découvert ce site et je vous le recommande fortement. » |
| 7. Offre | 60–70 s | « Le catalogue complet coûte 39 000 FCFA, en un seul paiement. Accès immédiat, à vie, sur votre téléphone. Et chaque nouveau modèle ajouté est inclus, sans rien payer de plus. » | Carte d'offre : ~~60 000~~ **39 000 FCFA** · Accès immédiat · À vie · Nouveaux modèles inclus |
| 8. Garantie | 70–76 s | « Et si le catalogue ne vous convient pas, un simple message WhatsApp dans les 7 jours, et nous vous remboursons. » | Sceau **Satisfait ou remboursé 7 jours** + logo WhatsApp |
| 9. Urgence (FOMO) | 76–82 s | Voir « Urgence » ci-dessous. | Texte de l'option retenue |
| 10. Appel à l'action | 82–88 s | « Touchez le bouton orange juste en dessous. Payez avec Orange Money, MTN, Wave ou Moov, et ouvrez votre catalogue dans deux minutes. » | Flèche animée vers le bas. Logos des 4 opérateurs. Texte : **Touchez « Obtenir le catalogue » ↓** |

## Urgence (à choisir, elle doit être vraie)

La vidéo est la même tous les jours : une date ou un compte à rebours dit à l'oral serait faux presque tous les jours, et un visiteur qui revient le remarque. Le compte à rebours actuel de la page se remet à zéro chaque minuit, ce qui pose le même problème.

| Option | Voix off | Condition |
|---|---|---|
| A. Coût de l'attente (toujours vraie) | « Chaque mois sans plan, ce sont des prix de matériaux qui montent et un projet qui recule. Commencez aujourd'hui. » | Aucune |
| B. Hausse de prix liée au catalogue | « Le prix passera à 60 000 FCFA quand le catalogue atteindra [80] modèles. Ceux qui rejoignent maintenant gardent leur accès à vie. » | Vous vous engagez à appliquer la hausse au palier annoncé |
| C. Prix de lancement daté | « Prix de lancement jusqu'au [date]. » | Vidéo refaite ou recoupée à chaque nouvelle période |

Recommandation : **A + B**. A crée l'envie d'agir sans rien promettre de faux ; B donne une vraie raison de ne pas attendre.

## Aperçu muet (6 s, en boucle avant le clic)

Plans 1 et 5 en accéléré : visage + « Combien va vraiment coûter votre maison ? », puis le devis V3-001 qui défile. Bandeau fixe : **▶ Touchez pour le son**. Au toucher, la vidéo complète démarre au début, avec le son.

## À fournir pour la production

1. Vidéo face caméra du fondateur (téléphone à hauteur des yeux, fenêtre de face, micro-cravate si possible), plans 1, 3, 4, 7, 8, 10.
2. Enregistrement d'écran du téléphone dans l'espace Premium : grille des modèles, fiche V3-001 complète, téléchargement de la fiche PDF.
3. Accord de Francis et Renaud pour réutiliser leurs extraits.
4. Choix de l'urgence (A, B ou C) et, pour B, le palier de modèles.
5. Confirmation des chiffres de preuve sociale (« +735 commandes », « 4,9/5 ») avant de les utiliser.

## Mesure après mise en ligne

Événements déjà en place : `video_play`, `video_start` (attente), `video_progress` (25/50/75/100 %), `video_start_abandoned`. Comparer sur 2 à 3 semaines : taux de lancement (11 % aujourd'hui), part qui atteint 75 %, et taux de clic « Obtenir » après visionnage (46 % aujourd'hui).
