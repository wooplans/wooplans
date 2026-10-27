# WooPlans — plateforme unifiée

Site vitrine, page de vente, espace Premium, tableau de bord et CRM de WooPlans, sur **Cloudflare** (Workers, D1, R2), sans dépendance à Framer.

## Le tunnel

```
Vidéos et publications ──▶ Vitrine (/ , /catalogue, /catalogue/<modèle>)
                              │  bouton unique « Obtenir le Catalogue Premium »
                              ▼
                     Page de vente /catalogue-premium
                              │  formulaire → paiement Chariow (prix : src/config/catalogue.json)
                              ▼
        Notification Chariow signée ──▶ membre créé + code d'accès (écran /merci + email Resend)
                              │
                              ▼
                   Espace Premium /espace-premium
     (fiches complètes, favoris, comparateur, fiche PDF par modèle, WhatsApp)
                              │  « Commander les plans complets »
                              ▼
                 CRM /admin/crm : demande → qualification → devis
                   → commande → production → livraison
```

## Stack

| Rôle | Outil |
|---|---|
| Application | Next.js 15 (App Router) compilé par **OpenNext** pour **Cloudflare Workers** |
| Base de données | **Cloudflare D1** via Drizzle ORM (`src/db/schema.ts`, migrations dans `drizzle/`) |
| Fichiers | **Cloudflare R2** : `MEDIA` (rendus publics, distributions privées), `VIDEOS` (vidéos de la page de vente) |
| Fiches PDF | **pdf-lib** dans le Worker + binding **Cloudflare Images** (`IMAGES`, conversion WebP → JPEG hors CPU du Worker) |
| Paiement | **Chariow** (notifications « Pulse » signées HMAC) ; **Wajub** en essai (webhooks signés HMAC, voir « 4 bis ») |
| Emails | **Resend** (codes d'accès, relances CRM, récapitulatif quotidien) |
| Mesure | Suivi first-party du tunnel (`/api/t`, UTM, fait foi pour les ventes), Pixel Meta, **PostHog** UE (comportement : enregistrements masqués, cartes de chaleur, tunnel) |
| Pilotage par agent | Serveur **MCP** intégré (`/api/mcp`) |

## Pages

| URL | Contenu |
|---|---|
| `/` | Accueil, modèles mis en avant, étapes, témoignages, FAQ |
| `/catalogue`, `/catalogue-villa`, `/catalogue-duplex`, `/catalogue/<slug>` | Catalogue public filtrable et fiches (rendus, chambres, niveaux, surfaces, dimensions, budget indicatif) |
| `/catalogue-premium` | Page de vente (HTML statique `public/lp/catalogue-premium.html`, généré par `scripts/build-sales-page.py` depuis `scripts/sales-page.source.html`) |
| `/merci` | Confirmation de paiement et affichage du code d'accès |
| `/connexion` | Connexion membre (email + code), « code perdu » |
| `/espace-premium/…` | Index et filtres, fiche complète, favoris, comparateur (3 modèles), fiches PDF |
| `/plans-personnalises` | Offre et tarifs des plans complets, formulaire de demande (→ CRM) |
| `/a-propos`, `/contact`, `/mentions-legales`, `/conditions-generales-de-vente`, `/confidentialite` | Pages institutionnelles |
| `/admin/…` | Tableau de bord du tunnel, CRM, ventes, membres, modèles, emails, réglages |

## Sécurité des paiements et des accès

- **Signature Chariow** vérifiée sur le corps brut (HMAC-SHA256, comparaison en temps constant) ; requête refusée en 401 sinon.
- **Déduplication** sur `x-pulse-delivery-id` ; une vente n'active l'accès qu'**une seule fois**, même reçue par plusieurs Pulses.
- **Contrôle du produit** : seuls les produits « Catalogue Premium » (`CHARIOW_CATALOGUE_PRODUCT_ID` + anciens produits) ouvrent un accès.
- **Activation uniquement sur paiement confirmé** (`successful.sale`, statut `completed`) ; les événements de test n'activent rien.
- **Codes d'accès** personnels, hachés en base, limités en tentatives ; **révocation immédiate** (les sessions ouvertes sont invalidées).
- **Fichiers Premium** (distributions cotées) servis uniquement à un membre actif, jamais via une URL publique.
- **Fiches PDF** (`/api/premium/fiche-pdf/<slug>`) assemblées à la demande pour un membre actif, filigranées à son nom et à son email, avec une empreinte `W-XXXXXX` propre au couple membre/modèle (`src/lib/watermark.ts`).
- Le code n'est affiché sur `/merci` qu'au navigateur qui a lancé l'achat, pendant quelques heures.

## Mise en production

### 1. Cloudflare

```bash
npx wrangler login
# La base « wooplans-platform » existe déjà (schéma appliqué, 10 plans importés).
npx wrangler d1 migrations apply DB --remote   # applique les futures migrations
```

Secrets (une fois) :

```bash
npx wrangler secret put AUTH_SECRET            # longue chaîne aléatoire (openssl rand -base64 48)
npx wrangler secret put CHARIOW_PULSE_SECRET   # secret « whsec_… » du Pulse Chariow
npx wrangler secret put CHARIOW_API_KEY        # clé API Chariow (import des anciens acheteurs)
npx wrangler secret put RESEND_API_KEY         # clé Resend (domaine wooplans.com vérifié)
npx wrangler secret put MCP_TOKEN              # jeton du serveur MCP (32+ caractères)
npx wrangler secret put CRON_SECRET            # jeton interne du récapitulatif quotidien
```

Variables publiques : `wrangler.jsonc` (`vars`) — URL du site, produit Chariow, prix, WhatsApp, Pixel, PostHog (`POSTHOG_KEY`, clé publique `phc_…`, et `POSTHOG_HOST`), expéditeur des emails.

### 2. Compte admin

```bash
node scripts/create-admin.mjs vous@wooplans.com "MotDePasseTrèsSolide" > /tmp/admin.sql
npx wrangler d1 execute DB --remote --file /tmp/admin.sql
```

### 3. Données

- **Plans de l'ancienne base** : déjà importés (`scripts/import/legacy-plans.sql`, regénérable avec `scripts/import/legacy-to-sql.mjs`).
- **Anciens acheteurs** : Admin → Membres → « Importer les acheteurs Chariow », puis « Envoyer les codes » (par lots de 25).
- **Nouveaux modèles** : Admin → Modèles → « Nouveau modèle » (rendus publics, distributions privées, devis par lot).
- **Fiches PDF** : rien à faire. Chaque fiche publiée a sa fiche PDF, générée au téléchargement depuis les données en ligne (toujours à jour). Admin → Réglages ne sert plus qu'à proposer l'ancien catalogue complet, s'il y en a un.
- **Compléter les fiches Premium** (pièces, devis par lots, distributions) : prompt prêt à l'emploi pour Claude Cowork dans `docs/prompt-cowork-fiches-premium.md`.

### 4. Chariow

Dans Chariow → Automatisations → Pulses : créer un Pulse vers `https://www.wooplans.com/api/webhooks/chariow` avec les événements *Successful / Abandoned / Failed sale* sur le produit Catalogue Premium, puis copier son secret dans `CHARIOW_PULSE_SECRET`. Désactiver les anciens Pulses vers `woo-premium.pages.dev`.

### 4 bis. Wajub (essai, à la place de Chariow)

Wajub (checkout hébergé Mobile Money et carte, `src/lib/wajub.ts`) est branché sur les deux achats : Catalogue Premium (page de vente B, même formulaire court que pour Chariow, puis page Wajub) et plan et devis (fiches modèles). Une vente Wajub passe par le même traitement qu'une vente Chariow : code d'accès, plan et devis, CRM, relances, statistiques (identifiant de vente `trx_…`, membre de source « Wajub »).

1. Dashboard Wajub → Développeurs : créer une clé secrète (`sk_test.…` pour l'essai en sandbox, `sk.…` en production) puis l'ajouter aux secrets GitHub sous le nom `WAJUB_SECRET_KEY` (copié dans le Worker à chaque déploiement, comme les autres secrets ; ou directement `npx wrangler secret put WAJUB_SECRET_KEY`).
2. Webhooks : endpoint `https://www.wooplans.com/api/webhooks/wajub`, événements `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.cancelled` ; copier son secret (`whsec_…`) dans le secret GitHub `WAJUB_WEBHOOK_SECRET`.
3. Essai sans rien changer pour les visiteurs : ouvrir `https://www.wooplans.com/catalogue-premium?paiement=wajub` (le choix est gardé 7 jours dans ce navigateur, y compris sur les fiches modèles ; `?paiement=chariow` pour revenir). En sandbox, le numéro `+237670000000` réussit et `+237670000002` est refusé.
4. Bascule de tout le trafic : `"PAYMENT_PROVIDER": "wajub"` dans `wrangler.jsonc`. Retour arrière : `"chariow"`.

Limites : les codes promo restent ceux de Chariow (un achat de plan et devis avec code passe par Chariow ; le formulaire Wajub de la page de vente n'a pas de champ code promo) ; la page de vente A garde le widget Chariow. Le montant encaissé est contrôlé (prix de `src/config/catalogue.json` ou `projet.json`) avant d'ouvrir l'accès, et un paiement sandbox n'ouvre jamais d'accès avec une clé live.

### 5. Déploiement automatique

Chaque push sur `master` ou `ccr-03cfaad2-40szss` lance `.github/workflows/deploy.yml` : vérifications (types, lint, tests, build), migrations D1, déploiement. Secrets GitHub requis : `CLOUDFLARE_API_TOKEN` (permissions Workers, D1, R2) et `CLOUDFLARE_ACCOUNT_ID`.

### 6. Bascule du domaine (fin de Framer)

1. Vérifier le site sur l'URL `*.workers.dev`.
2. Compléter `src/lib/redirects.ts` avec toutes les URL du sitemap Framer qui changent.
3. Workers → `wooplans-web` → Domaines : ajouter `www.wooplans.com` et `wooplans.com` (redirection vers www).
4. Soumettre `https://www.wooplans.com/sitemap.xml` dans Google Search Console.

## Changer le prix du Catalogue Premium

Le prix est à **un seul endroit** : `src/config/catalogue.json` (`"price"`, en FCFA).

1. Changer le prix du produit sur Chariow (`prd_9cbatg`, type Licence : seul ce type accepte le paiement direct par l’API).
2. Modifier `src/config/catalogue.json`, puis `python3 scripts/build-sales-page.py` : les pages de vente A et B sont régénérées avec le prix, le reste à payer des plans complets (149 000 / 249 000 FCFA moins le prix), la remise par rapport au prix de 60 000 FCFA et la valeur Pixel.
3. Le reste du site (FAQ, CGV, fiches, espace Premium, crédit déduit des plans complets, Pixel Meta à l'achat, outils MCP) lit le même fichier.
4. VSL : `cd video/vsl && node voice.mjs` (ne régénère avec Gradium que les phrases qui citent le prix), puis `node render.mjs`, `node render.mjs --mode preview`, `node assemble.mjs preview` et `node assemble.mjs main` ; déposer `out/vsl-catalogue-premium.mp4` et `out/vsl-catalogue-premium-apercu.mp4` dans le bucket R2 `cpbook-videos` (la page les appelle avec `?v=<prix>`, donc sans ancien cache).
5. `npm test`, puis publier.

Crédit des plans complets : tout membre se voit déduire le prix actuel du catalogue (`cataloguePrice()`), quel que soit le prix auquel il l'a acheté.

## Page de vente

- Une seule page (`public/lp/catalogue-premium.html`, source `scripts/sales-page.source.html`) : page pensée pour l'acheteur mobile, 12 Ko compressée. Promesse « choisissez votre maison, connaissez son vrai coût », aperçu d'un vrai modèle (rendu, caractéristiques, intitulés des postes du devis — montants et plan coté masqués), modèles en vedette avec budget indicatif, témoignages (vidéos chargées au clic), étapes, offre, FAQ, barre collante et WhatsApp. Paiement : formulaire court sur la page (nom, email, numéro avec indicatif deviné d'après le pays du visiteur), prix sur le bouton, puis page de paiement Chariow (`/api/checkout`). Urgence, avis et prix barré conservés. Nombre de modèles, galerie et aperçu lus en base par `src/app/catalogue-premium/route.ts` (HTMLRewriter, cache mémoire de 5 min).
- Régénération : `python3 scripts/build-sales-page.py`.
- L'ancienne variante A (page historique avec widget Chariow) et le test A/B sont retirés. La page garde son marqueur « b » (`variant_b` pour la vue, suffixe `@b` pour les clics, intentions de paiement et achats) : le tableau de bord ne compte que ces événements, les chiffres de l'ancienne page A sont exclus.

## Tableau de bord /admin

- **Période** : 7 j, 30 j, 90 j, 1 an, ou **un jour précis** (`/admin?jour=AAAA-MM-JJ`, raccourcis « Aujourd'hui » / « Hier », jour précédent / suivant). Les jours sont comptés en heure du Cameroun (UTC+1). Sur un jour précis, les graphiques passent par heure.
- **D'où viennent les visiteurs** : une ligne par canal (Facebook, Instagram, YouTube, TikTok, WhatsApp, Google et moteurs, Email, ChatGPT et IA, Autres sites, Direct), « · publicité » quand la visite vient d'une pub reconnue. Canal déduit de l'UTM, sinon du site ou de l'appli d'origine (`src/lib/attribution.ts`, `channelOf`). Détail par campagne UTM dépliable. « Direct » = aucune trace de provenance (lien ouvert depuis WhatsApp ou une appli, favori) : ajouter `?utm_source=…` aux liens partagés pour les reconnaître. Les ventes importées de l'ancienne boutique Chariow (sans visite suivie) sont indiquées à part.
- Outil MCP `get_business_summary` : mêmes chiffres (`days` ou `day`).

## Analyse du comportement des visiteurs (PostHog)

Objectif : demander à l'agent Claude, à tout moment, où les visiteurs cliquent, bloquent, jusqu'où ils lisent et ce qui les frustre (par page, appareil, source), avec des recommandations priorisées.

- **Collecte** : PostHog, région UE (`eu.i.posthog.com`), chargé après interaction ou inactivité (page rapide). Site Next : `src/components/BehaviorAnalytics.tsx` (rendu seulement dans `src/app/(site)/layout.tsx`) ; page de vente statique : `scripts/lp-measure.js`, inséré par `scripts/build-sales-page.py` (relancer le script après avoir changé `POSTHOG_KEY`). Règles communes : `src/lib/behavior.ts`.
- **Jamais mesuré** : `/admin`, `/espace-premium`, `/connexion`, `/merci`, `/televersement` (non chargé, puis événements filtrés et enregistrement arrêté en navigation interne).
- **Aucune donnée personnelle** : saisies masquées (`maskAllInputs`), widget Chariow exclu (`ph-no-capture`), texte marqué `data-ph-mask` masqué, paramètres d'URL retirés sauf UTM/filtres, pas de profil de personne. L'identifiant PostHog est l'identifiant anonyme first-party `wp_vid` (renvoyé par `/api/t`).
- **Consentement** : visiteurs en Europe (fuseau horaire `Europe/…`) : bandeau, rien n'est chargé (PostHog, Pixel) avant « Accepter ». Ailleurs : mesure par défaut, refus possible sur `/confidentialite`. Cookie `wp_consent` (13 mois).
- **Événements** : `$pageview` (`page_type`, `plan`), `cta_click` (`cta_id`, suffixe `@a`/`@b`), `checkout_open`, `purchase_success` (envoyé par le serveur depuis le webhook Chariow, vente reliée avec certitude à la visite, hors Europe), `plan_request_submit`, `whatsapp_click`, `promo_popup_*`, plus clics de rage, clics morts, défilement et sorties. Provenance : `wp_source` / `wp_campaign` (regroupées par canal dans `/admin`), `variant` (toujours `b`) sur la page de vente.
- **Accès de l'agent** : serveur MCP officiel PostHog connecté à l'agent (requêtes, tunnels, cartes de chaleur, recherche et résumés d'enregistrements). Les instructions du serveur MCP WOOPLANS décrivent la méthode d'analyse (tunnel par segment, frictions, recommandations impact/effort, liens d'enregistrements). Les ventes font foi dans `get_business_summary` / `list_sales`.

Mise en place (une fois) :
1. Créer un compte sur https://eu.posthog.com (région **EU**), projet « wooplans.com » ; copier la **Project API key** (`phc_…`, publique) dans `POSTHOG_KEY` de `wrangler.jsonc`, puis `python3 scripts/build-sales-page.py` et pousser.
2. Réglages du projet PostHog : Session replay activé (masquage des saisies : par défaut), Heatmaps et Autocapture activés ; « Authorized URLs » : `https://www.wooplans.com` ; échantillonnage des enregistrements si le volume dépasse le plan gratuit.
3. Connecter l'agent : sur claude.ai, Réglages → Connecteurs → ajouter un connecteur personnalisé `https://mcp-eu.posthog.com/mcp` et se connecter à PostHog (OAuth). Pour un client sans OAuth : clé API personnelle PostHog (préréglage « MCP Server », limitée au projet). Aucune clé PostHog privée ne va dans le dépôt ni dans le Worker.

## Pilotage par un agent (MCP)

Le site expose un serveur MCP (`/api/mcp`, transport HTTP) protégé par `MCP_TOKEN`. Outils : résumé du tunnel par source/campagne, ventes, membres (donner, renvoyer ou révoquer un accès), CRM (lister, créer, faire avancer une demande, noter, encaisser, relancer par email), catalogue (lister, consulter une fiche complète, créer un modèle en brouillon, ajouter et organiser rendus et distributions, mettre à jour textes/SEO/caractéristiques/pièces/devis par lots, publier).

```bash
# Claude Code
claude mcp add --transport http wooplans https://www.wooplans.com/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

Pour un client qui ne permet pas d'en-tête (connecteur personnalisé claude.ai) : `https://www.wooplans.com/api/mcp/<MCP_TOKEN>` — à garder secret, et à changer (`wrangler secret put MCP_TOKEN`) en cas de doute.

Exemples de demandes : « Combien de ventes cette semaine et quelle campagne a le mieux converti ? », « Ajoute la demande de M. Kamga reçue sur WhatsApp, modèle V3-037, relance jeudi », « Quelles relances dois-je faire aujourd'hui ? ».

### Créer un modèle du catalogue par l'agent

Donnez à l'agent le PDF du modèle (descriptif, surfaces, pièces, devis) et les images (rendus 3D, distributions). Il suit ce flux, décrit dans les instructions du serveur MCP :

1. **`create_plan`** — crée la fiche, **toujours en brouillon**. Slug généré depuis catégorie + référence (`villa` + `V4-001` → `villa-v4-001`) ; refus si la référence ou le slug existe déjà. Validation stricte : nombres réels (pas de texte), entiers pour chambres/niveaux/surfaces/montants, bornes, champs inconnus refusés. Champs : référence, nom, catégorie (`villa`, `duplex`, `immeuble`, `autre`), accroche, description, SEO, chambres, salles de bain, niveaux, surface totale, emprise, dimensions du bâtiment et du terrain, budget indicatif (déduit du devis ± 10 % s'il manque), et côté Premium : pièces avec surfaces, devis par lots, hypothèses de coût, points forts, points de vigilance, notes.
2. **Images sur votre ordinateur : `create_upload_link`** — l'agent crée un lien d'envoi temporaire (2 h par défaut, 24 h max) limité à cette fiche. Sur claude.ai, il vous donne le lien de la page `/televersement#…` : vous y choisissez vos rendus et vos distributions (40 Mo max par fichier), puis vous lui dites que c'est fait. Avec Claude Code, il envoie lui-même chaque fichier local par `curl -T` (en flux, sans passer le contenu dans la conversation). Le jeton signé (HMAC, `AUTH_SECRET`) est dans le fragment de l'URL ou l'en-tête `Authorization`, jamais dans les journaux.
   **Images en ligne : `upload_plan_image`** — depuis une URL https (téléchargée par le Worker, en flux vers R2) ou un contenu base64 (8 Mo max). `role=render` : rendu public (png, jpeg, webp) servi par `/media/<clé>`, le premier devient la couverture. `role=floor_plan` : distribution **privée** (png, jpeg, webp ou PDF) servie par `/api/premium/fichier/<clé>` aux seuls membres. Le type réel est vérifié sur les premiers octets ; fichiers rangés dans `public|private/<référence>/` comme l'upload admin (code commun : `src/lib/media-store.ts`).
3. **`set_plan_cover`**, **`reorder_plan_images`**, **`remove_plan_image`** — gestion de la galerie (le retrait supprime aussi le fichier de R2 s'il n'appartient qu'à ce modèle).
4. **`get_plan`** — fiche complète, champs Premium compris, pour vérification.
5. L'agent vous présente un résumé ; **la publication** (`update_plan_content` avec `status=published`) n'a lieu qu'après votre accord.

**Plusieurs modèles d'un coup (Cowork ou Claude Code)** : donnez à l'agent l'accès à un dossier contenant un sous-dossier par modèle (PDF + images). Il vérifie les références déjà au catalogue, crée chaque fiche en brouillon, envoie lui-même les images par le lien d'envoi (`curl -T`), puis vous présente un tableau récapitulatif ; vous choisissez ce qui est publié.

Conventions : référence `V4-001` (V = villa, D = duplex, chiffre = nombre de chambres), nom « Villa V4-001 », surfaces en m², dimensions en m, montants entiers en FCFA.

## Développement local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev                 # Next.js avec les bindings Cloudflare locaux
npm run preview             # build OpenNext + Worker local (wrangler dev)
npm run typecheck && npm run lint && npm test
```

Modifier le schéma : `src/db/schema.ts` puis `npm run db:generate` (nouvelle migration dans `drizzle/`).
