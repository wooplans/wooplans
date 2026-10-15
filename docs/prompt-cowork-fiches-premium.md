# Prompt Claude Cowork : compléter les fiches Premium

À coller dans Claude Cowork, avec le connecteur **wooplans** (serveur MCP `https://www.wooplans.com/api/mcp/<MCP_TOKEN>`) activé et l'accès au dossier qui contient les PDF des modèles.

---

Tu complètes les fiches Premium du catalogue WOOPLANS à partir des PDF de mon dossier `<CHEMIN DU DOSSIER>` (un PDF par modèle : descriptif, distributions cotées, surfaces des pièces, devis par lots). Le connecteur **wooplans** te donne les outils `list_plans`, `get_plan`, `update_plan_content`, `create_upload_link` et `upload_plan_image`.

Règles absolues :
- **N'invente aucune valeur.** Si un chiffre n'est pas dans le PDF, laisse le champ vide et note-le dans ton rapport.
- **Ne change jamais le statut** (`status`) d'un modèle : pas de publication ni de dépublication.
- Nombres en valeurs numériques sans unité ni séparateur : surfaces en m², dimensions en m, montants entiers en FCFA (ex. `4005200`).
- Ne modifie que les modèles listés à l'étape 1, un à la fois, et vérifie chaque fiche avant de passer à la suivante.

Étapes :
1. Appelle `list_plans` et garde les modèles publiés dont `has_floor_plans` ou `has_estimate_lots` vaut `false`. Pour chacun, trouve le PDF correspondant dans le dossier (la référence, ex. `D4-012` ou `V4-005`, figure dans le nom du fichier ou sur la première page). S'il n'y a pas de PDF, mets le modèle dans le rapport et passe au suivant.
2. Lis le PDF et extrais :
   - `bedrooms`, `bathrooms`, `levels` (1 = plain-pied), `surface_total` (surface habitable totale) ;
   - `rooms` : chaque pièce `{ "name": "Séjour", "area": 30.5, "level": "RDC" }` (`level` seulement pour les modèles à étage : « RDC », « R+1 »…) ;
   - `estimate_lots` : chaque lot du devis `{ "label": "Fondation", "amount": 4005200 }`, et `estimate_total` s'il est indiqué ;
   - si présents : `footprint` (emprise), `building_width`/`building_depth`, `land_area`/`land_width`/`land_depth`, `cost_assumptions`, `strengths`, `watchouts`.
3. Appelle `update_plan_content` avec `code` et uniquement les champs trouvés. Si la réponse contient `warnings` (ex. somme des lots ≠ total), vérifie le PDF et corrige si c'est une erreur de lecture.
4. Distributions cotées : si `get_plan` ne montre aucune distribution (`floor_plans` vide), extrais du PDF les pages de distribution (une image PNG ou JPEG par niveau, bien lisible, 40 Mo max) et ajoute-les :
   - appelle `create_upload_link` pour ce modèle, puis envoie chaque image avec la commande `curl_floor_plan` fournie (en remplaçant le chemin) ;
   - si tu ne peux pas exécuter `curl`, donne-moi le lien de la page d'envoi, attends que je confirme avoir déposé les fichiers, puis continue.
   N'ajoute pas de rendus 3D : ils sont déjà en ligne.
5. Vérifie avec `get_plan` : chambres, surfaces, pièces, lots et total du devis, distributions présentes.
6. À la fin, donne-moi un tableau : référence, champs remplis, nombre de pièces, nombre de lots, total du devis, distributions ajoutées, valeurs manquantes ou douteuses.

Commence par les 5 premiers modèles, montre-moi le tableau, et attends mon accord avant de traiter les suivants.
