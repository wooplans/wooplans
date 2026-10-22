# VSL du Catalogue Premium (section héro de /catalogue-premium)

Remplace `/videos/vsl-cpbook-digital.mp4` (29 s, 16:9, avatar IA, logo Veo visible, livre papier « Édition 2024 », « 50 modèles », « télécharger », sans prix ni garantie).

## Le message à faire passer

Les visiteurs se demandent : « Est-ce que je peux construire avec les plans du Catalogue Premium ? » (question posée aussi sur WhatsApp). La réponse est non, et la vidéo doit le dire clairement, en le présentant comme un avantage :

1. **Choisir** : le Catalogue Premium (39 000 FCFA) sert à comparer les modèles et connaître leur budget de construction.
2. **Obtenir ses plans pour construire** : les plans complets, adaptés au terrain, à prix fixe (149 000 FCFA villa, 249 000 FCFA duplex), avec les 39 000 FCFA du catalogue déduits (reste 110 000 ou 210 000 FCFA).
3. **Construire** : avec les plans complets et le devis, le chantier démarre.

Le visiteur doit toujours voir à quelle étape il se trouve : une **feuille de route en 3 étapes** sert de fil conducteur à toute la vidéo.

Sources : `src/lib/custom-plans.ts`, `src/lib/faq.ts`, CGV (« Les distributions cotées et les devis estimatifs servent à comparer et à choisir un modèle. Ils ne constituent pas des plans d'exécution. »).

## Ce que les données imposent

| Constat (PostHog, 30 jours) | Conséquence pour la vidéo |
|---|---|
| 11 % des visiteurs lancent la vidéo | La 1ʳᵉ image doit accrocher seule ; aperçu muet en boucle de 6 s, sous-titré |
| 46 % de ceux qui la voient cliquent « Obtenir » (10 % sans) | La vidéo est le meilleur vendeur de la page : elle mérite une vraie production |
| 59 % partent en 10 s | Accroche dans les 3 premières secondes, sans introduction ni logo |
| 17 ouvrent le paiement, 2 paient ; FAQ « Puis-je télécharger ? » la plus ouverte | La vidéo dit exactement ce qu'on reçoit, à quoi ça sert, et comment on paie |
| Visiteurs sur Android, données mobiles | Fichier léger (≤ 6 Mo), format 4:5, sous-titres incrustés (regardée sans le son) |

## Style : motion design, avec du réel dedans

- **Motion design** pour l'accroche, la feuille de route, le calcul de la déduction et l'offre : c'est le format qui explique le mieux un parcours en étapes et un prix.
- **Images réelles** insérées dans l'animation, pour la confiance : enregistrement d'écran de l'espace Premium dans un cadre de téléphone, vrais rendus 3D, vrais extraits de témoignages.
- **Voix off humaine**, chaleureuse, accent d'Afrique francophone (voix enregistrée, ou voix ElevenLabs choisie sur échantillon).
- **Charte WOOPLANS** : vert #0F5B59, orange #F08A2E (réservé aux appels à l'action), or #E7C36C pour le Premium ; police Plus Jakarta Sans, comme la page.
- **Rythme** : un changement visuel toutes les 2 à 3 s ; texte à l'écran = mots-clés de la voix, jamais une phrase entière.

## Format

- **Durée :** 85 à 95 s (≈ 250 mots de voix off).
- **Cadre :** 4:5 (1080 × 1350). Le bloc `.vsl` de la page passe de 16:9 à 4:5.
- **Sous-titres :** incrustés, 2 lignes maximum, zone basse sûre.
- **Poids :** H.264 ≈ 1,2 Mb/s, AAC 96 kb/s → ≈ 6 Mo. Aperçu muet de 6 s ≤ 1 Mo.
- **Image d'aperçu :** la feuille de route en 3 étapes, l'étape 1 allumée, texte « Peut-on construire avec ces plans ? » + bouton lecture.

## Script

| # | Temps | Voix off | Motion design / images |
|---|---|---|---|
| 1. Accroche | 0–6 s | « Vous voulez construire votre maison ? Avant le premier sac de ciment, il y a trois étapes. Les sauter, c'est risquer un chantier qui s'arrête en route. » | Un sac de ciment tombe, se fige. Une route se dessine avec 3 jalons éteints. |
| 2. Problème | 6–13 s | « Budget dépassé, plans changés en plein chantier, maisons inachevées pendant des années : on le voit partout. » | Trois pictogrammes qui claquent : facture qui grimpe, plan raturé, maison sans toit. |
| 3. Feuille de route | 13–20 s | « Avec WOOPLANS, le parcours est clair. Un : vous choisissez votre maison et son budget. Deux : vous obtenez vos plans complets. Trois : vous lancez votre chantier. » | Les 3 jalons s'allument l'un après l'autre : **Choisir → Plans complets → Construire**. La route reste en haut de l'écran jusqu'à la fin, l'étape en cours allumée. |
| 4. Étape 1 | 20–38 s | « L'étape un, c'est le Catalogue Premium. Plus de 60 villas et duplex, avec leurs rendus 3D, leurs plans cotés, la surface de chaque pièce et un devis poste par poste. Par exemple, la villa V3-001 : trois chambres, 92 m², entre 10,6 et 13 millions de FCFA de construction. Vous comparez, vous décidez en famille, avant de dépenser un franc sur le chantier. » | Jalon 1 allumé. Téléphone avec enregistrement d'écran réel : grille des modèles → fiche V3-001 → rendus → plan coté → devis. Compteur qui monte jusqu'à « 10,6 – 13 M FCFA ». |
| 5. La précision | 38–45 s | « Attention : le catalogue sert à choisir. Pour construire, il vous faut les plans complets de votre maison, adaptés à votre terrain. » | Écran partagé : **Catalogue = choisir** / **Plans complets = construire**. |
| 6. Étape 2 | 45–60 s | « C'est l'étape deux. Plans cotés, façades et coupes, plan de masse sur votre terrain, plans de fondation. À prix fixe, connu d'avance : 149 000 FCFA pour une villa, 249 000 pour un duplex. Et les 39 000 FCFA du catalogue sont déduits. Le catalogue vous revient donc à zéro franc. » | Jalon 2 allumé. Les 4 livrables s'empilent. Calcul animé : **149 000 − 39 000 = 110 000 FCFA**, puis **249 000 − 39 000 = 210 000 FCFA**. Tampon « Prix fixe ». |
| 7. Étape 3 | 60–66 s | « Étape trois : avec vos plans complets et votre devis en main, vous lancez votre chantier en sachant exactement où vous allez. » | Jalon 3 allumé. La maison V3-001 se construit en accéléré : fondation, murs, toit (rendus 3D). |
| 8. Preuve | 66–76 s | Voix des clients | Extraits réels dans un cadre arrondi. Francis 00:11–00:15 : « J'ai été très satisfait par la qualité des devis et des plans. » Renaud 00:43–00:49 : « J'ai découvert ce site et je vous le recommande fortement. » |
| 9. Offre et garantie | 76–84 s | « Aujourd'hui, commencez par l'étape un : 39 000 FCFA en un seul paiement, accès immédiat et à vie, nouveaux modèles inclus. Et satisfait ou remboursé pendant 7 jours. » | Carte d'offre : **39 000 FCFA** · Accès immédiat · À vie · Déduit de vos plans complets. Sceau **7 jours**. |
| 10. Urgence | 84–88 s | Voir « Urgence » ci-dessous. | Texte de l'option retenue. |
| 11. Appel à l'action | 88–94 s | « Touchez le bouton orange juste en dessous, payez avec Orange Money, MTN, Wave ou Moov, et choisissez votre maison dès aujourd'hui. » | Flèche orange animée vers le bas. Logos des 4 opérateurs. **Touchez « Obtenir le catalogue » ↓** |

## Urgence (à choisir, elle doit être vraie)

La vidéo est la même tous les jours : une date ou un compte à rebours dit à l'oral serait faux presque tous les jours.

| Option | Voix off | Condition |
|---|---|---|
| A. Coût de l'attente (toujours vraie) | « Chaque mois sans plan, ce sont des prix de matériaux qui montent et un projet qui recule. » | Aucune |
| B. Hausse de prix liée au catalogue | « Le prix passera à 60 000 FCFA quand le catalogue atteindra [80] modèles. Ceux qui rejoignent maintenant gardent leur accès à vie. » | Vous vous engagez à appliquer la hausse au palier annoncé |
| C. Prix de lancement daté | « Prix de lancement jusqu'au [date]. » | Vidéo refaite à chaque nouvelle période |

Recommandation : **A + B**.

## Aperçu muet (6 s, en boucle avant le clic)

La feuille de route qui s'allume (plan 3) puis le calcul 149 000 − 39 000 (plan 6). Bandeau fixe : **▶ Touchez pour le son**. Au toucher, la vidéo complète démarre au début, avec le son.

## À aligner sur la page de vente (même objection)

- FAQ « Puis-je télécharger les plans ? » : « pour l'imprimer ou la montrer à votre maçon » laisse croire qu'on peut construire avec.
- FAQ « Le catalogue suffit-il pour construire ? » : dit « sur devis », alors que les plans complets ont un prix fixe (149 000 / 249 000 FCFA).
- Ajouter la feuille de route en 3 étapes sous le héro, et la déduction dans la carte d'offre.

## À fournir pour la production

1. Enregistrement d'écran du téléphone dans l'espace Premium : grille des modèles, fiche V3-001 complète.
2. Accès aux rendus 3D de V3-001 et aux témoignages (réseau de l'environnement : autoriser wooplans.com et wooplans.b-cdn.net), et l'accord de Francis et Renaud.
3. Choix de la voix : votre voix enregistrée, ou une voix ElevenLabs choisie sur échantillons.
4. Choix de l'urgence (A, B ou C) et, pour B, le palier de modèles.

## Mesure après mise en ligne

Événements en place : `video_play`, `video_start` (attente), `video_progress` (25/50/75/100 %), `video_start_abandoned`. Comparer sur 2 à 3 semaines : taux de lancement (11 % aujourd'hui), part qui atteint 75 %, taux de clic « Obtenir » après visionnage (46 % aujourd'hui), et nombre de questions WhatsApp « peut-on construire avec ? ».
