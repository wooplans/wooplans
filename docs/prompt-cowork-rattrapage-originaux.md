# Prompts Claude Cowork : originaux des rendus dans R2

À coller dans Claude Cowork, avec le connecteur **wooplans** activé et l'accès au dossier qui contient les modèles.
Cowork doit pouvoir exécuter des commandes (`curl`) : c'est ce qui envoie les fichiers sans passer par la conversation.

---

## 1. Rattrapage des modèles déjà en ligne (à faire une fois)

Tu ranges dans R2 les originaux de mes modèles déjà en ligne, à partir de mon dossier `<CHEMIN DU DOSSIER>` (un sous-dossier par modèle : rendus 3D, PDF du modèle, parfois une vidéo de visite guidée). Le serveur garde chaque original en privé et fabrique lui-même la version du site (légère, avec le nouveau filigrane uniforme), qui remplace l'ancienne.

Règles absolues :
- **Ne change jamais le statut** d'un modèle (pas de publication ni de dépublication) et ne modifie pas ses textes.
- **N'envoie que des originaux** : rendus en pleine résolution, sans filigrane. Si une image porte déjà un filigrane ou paraît être une copie réduite, ne l'envoie pas et signale-la.
- Un modèle à la fois ; vérifie chaque modèle avant de passer au suivant.
- Ne transmets jamais un fichier ni un lien temporaire à quelqu'un d'autre que moi.

Étapes, pour chaque modèle :
1. Appelle `list_plans` pour avoir la liste des modèles en ligne, puis associe chaque sous-dossier à sa référence (ex. `V3-037`, `D4-012`), qui figure dans le nom du dossier, des fichiers ou sur la première page du PDF. Un dossier sans modèle en ligne : note-le dans le rapport et passe.
2. Appelle `list_plan_files` pour ce modèle. Si `summary.originals_missing` vaut 0 et que les originaux sont à jour, passe au modèle suivant (le rattrapage est déjà fait).
3. **Choisis les rendus les plus récents du dossier** : s'il y a plusieurs versions (sous-dossiers « anciens », « v2 », dates, mêmes vues en double), garde la série la plus récente d'après la date de modification des fichiers et les noms. Ignore les plans cotés, captures, vidéos et fichiers de travail. En cas de doute, demande-moi.
4. Classe ces rendus dans l'ordre d'affichage : la plus belle vue de façade en premier (couverture), puis les autres vues extérieures, puis les intérieures.
5. Appelle `create_upload_link` pour ce modèle, puis envoie chaque rendu avec la commande `curl_render` (dans l'ordre choisi). Note le nombre N de rendus envoyés avec succès.
6. Appelle `list_plan_files` : les N derniers rendus doivent avoir un original (`original` non vide) et une version du site. Si tout est bon, appelle `replace_plan_renders` avec `keep_last = N` : les anciens rendus quittent le site et restent 30 jours dans R2 avant suppression.
7. PDF du modèle : si `documents` est vide, envoie le PDF avec `curl_document`.
8. Distributions cotées : si `floor_plans` est vide, extrais du PDF une image par niveau (PNG, bien lisible) et envoie-les avec `curl_floor_plan`. Sinon n'y touche pas.
9. Vidéo de visite guidée : s'il y en a une dans le dossier et que `videos` est vide, envoie-la avec `curl_video` (moins de 40 Mo) ou la commande `video_over_40_mb`.
10. Vérifie une dernière fois avec `list_plan_files`.

À la fin de chaque lot, donne-moi un tableau : référence, dossier utilisé, rendus envoyés (N), originaux propres / filigranés / inconnus (`watermarked`), PDF, distributions, vidéo, problèmes ou doutes.

Commence par 5 modèles, montre-moi le tableau, et attends mon accord avant de continuer. À la fin, appelle `get_storage_usage` et donne-moi le volume stocké.

---

## 2. Mise à jour des rendus d'un modèle (après amélioration)

J'ai amélioré les rendus du modèle `<RÉFÉRENCE>` ; les nouveaux sont dans `<CHEMIN DU DOSSIER>`.
1. Appelle `list_plan_files` pour voir les rendus actuels.
2. Prends les rendus les plus récents du dossier (originaux pleine résolution, sans filigrane), dans l'ordre d'affichage (couverture en premier).
3. `create_upload_link`, puis envoie chaque rendu avec `curl_render`. Note le nombre N envoyé.
4. Vérifie avec `list_plan_files`, montre-moi les nouveaux rendus, et après mon accord appelle `replace_plan_renders` avec `keep_last = N`.
5. Les anciens rendus restent 30 jours dans R2 (annulable avec `restore_plan_file`), puis sont supprimés automatiquement.

---

## 3. Récupérer un fichier d'un modèle (sans l'ordinateur)

« Donne-moi les rendus haute résolution du modèle `<RÉFÉRENCE>` » : `list_plan_files`, puis `get_plan_file` pour chaque clé voulue (aperçu avec `width`, ou fichier complet téléchargé avec `curl -fsSLo <fichier> "<download_url>"`). Même chose pour le PDF, les distributions cotées et la vidéo.
