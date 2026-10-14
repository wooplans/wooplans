# WooPlans — plateforme unifiée

Site vitrine, page de vente, espace Premium, tableau de bord et CRM de WooPlans, sur **Cloudflare** (Workers, D1, R2), sans dépendance à Framer.

## Le tunnel

```
Vidéos et publications ──▶ Vitrine (/ , /catalogue, /catalogue/<modèle>)
                              │  bouton unique « Obtenir le Catalogue Premium »
                              ▼
                     Page de vente /catalogue-premium
                              │  formulaire → paiement Chariow (39 000 FCFA)
                              ▼
        Notification Chariow signée ──▶ membre créé + code d'accès (écran /merci + email Resend)
                              │
                              ▼
                   Espace Premium /espace-premium
           (fiches complètes, favoris, comparateur, PDF, WhatsApp)
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
| Fichiers | **Cloudflare R2** : `MEDIA` (rendus publics, distributions et PDF privés), `VIDEOS` (vidéos de la page de vente) |
| Paiement | **Chariow** (notifications « Pulse » signées HMAC) |
| Emails | **Resend** (codes d'accès, relances CRM, récapitulatif quotidien) |
| Mesure | Suivi first-party du tunnel (`/api/t`, UTM), Pixel Meta, Microsoft Clarity |
| Pilotage par agent | Serveur **MCP** intégré (`/api/mcp`) |

## Pages

| URL | Contenu |
|---|---|
| `/` | Accueil, modèles mis en avant, étapes, témoignages, FAQ |
| `/catalogue`, `/catalogue-villa`, `/catalogue-duplex`, `/catalogue/<slug>` | Catalogue public filtrable et fiches (rendus, chambres, niveaux, surfaces, dimensions, budget indicatif) |
| `/catalogue-premium` | Page de vente (HTML optimisé, `public/lp/catalogue-premium.html`, généré par `scripts/build-sales-page.py`) |
| `/merci` | Confirmation de paiement et affichage du code d'accès |
| `/connexion` | Connexion membre (email + code), « code perdu » |
| `/espace-premium/…` | Index et filtres, fiche complète, favoris, comparateur (3 modèles), téléchargements |
| `/plans-personnalises` | Offre et tarifs des plans complets, formulaire de demande (→ CRM) |
| `/a-propos`, `/contact`, `/mentions-legales`, `/conditions-generales-de-vente`, `/confidentialite` | Pages institutionnelles |
| `/admin/…` | Tableau de bord du tunnel, CRM, ventes, membres, modèles, emails, réglages |

## Sécurité des paiements et des accès

- **Signature Chariow** vérifiée sur le corps brut (HMAC-SHA256, comparaison en temps constant) ; requête refusée en 401 sinon.
- **Déduplication** sur `x-pulse-delivery-id` ; une vente n'active l'accès qu'**une seule fois**, même reçue par plusieurs Pulses.
- **Contrôle du produit** : seuls les produits « Catalogue Premium » (`CHARIOW_CATALOGUE_PRODUCT_ID` + anciens produits) ouvrent un accès.
- **Activation uniquement sur paiement confirmé** (`successful.sale`, statut `completed`) ; les événements de test n'activent rien.
- **Codes d'accès** personnels, hachés en base, limités en tentatives ; **révocation immédiate** (les sessions ouvertes sont invalidées).
- **Fichiers Premium** (distributions cotées, PDF) servis uniquement à un membre actif, jamais via une URL publique.
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

Variables publiques : `wrangler.jsonc` (`vars`) — URL du site, produit Chariow, prix, WhatsApp, Pixel, Clarity, expéditeur des emails.

### 2. Compte admin

```bash
node scripts/create-admin.mjs vous@wooplans.com "MotDePasseTrèsSolide" > /tmp/admin.sql
npx wrangler d1 execute DB --remote --file /tmp/admin.sql
```

### 3. Données

- **Plans de l'ancienne base** : déjà importés (`scripts/import/legacy-plans.sql`, regénérable avec `scripts/import/legacy-to-sql.mjs`).
- **Anciens acheteurs** : Admin → Membres → « Importer les acheteurs Chariow », puis « Envoyer les codes » (par lots de 25).
- **Nouveaux modèles** : Admin → Modèles → « Nouveau modèle » (rendus publics, distributions privées, devis par lot).
- **PDF du catalogue** : Admin → Réglages.

### 4. Chariow

Dans Chariow → Automatisations → Pulses : créer un Pulse vers `https://www.wooplans.com/api/webhooks/chariow` avec les événements *Successful / Abandoned / Failed sale* sur le produit Catalogue Premium, puis copier son secret dans `CHARIOW_PULSE_SECRET`. Désactiver les anciens Pulses vers `woo-premium.pages.dev`.

### 5. Déploiement automatique

Chaque push sur `master` lance `.github/workflows/deploy.yml` : vérifications (types, lint, tests, build), migrations D1, déploiement. Secrets GitHub requis : `CLOUDFLARE_API_TOKEN` (permissions Workers, D1, R2) et `CLOUDFLARE_ACCOUNT_ID`.

### 6. Bascule du domaine (fin de Framer)

1. Vérifier le site sur l'URL `*.workers.dev`.
2. Compléter `src/lib/redirects.ts` avec toutes les URL du sitemap Framer qui changent.
3. Workers → `wooplans-web` → Domaines : ajouter `www.wooplans.com` et `wooplans.com` (redirection vers www).
4. Soumettre `https://www.wooplans.com/sitemap.xml` dans Google Search Console.

## Pilotage par un agent (MCP)

Le site expose un serveur MCP (`/api/mcp`, transport HTTP) protégé par `MCP_TOKEN`. Outils : résumé du tunnel par source/campagne, ventes, membres (donner, renvoyer ou révoquer un accès), CRM (lister, créer, faire avancer une demande, noter, encaisser, relancer par email), catalogue (lister, mettre à jour textes/SEO/caractéristiques, publier).

```bash
# Claude Code
claude mcp add --transport http wooplans https://www.wooplans.com/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

Pour un client qui ne permet pas d'en-tête (connecteur personnalisé claude.ai) : `https://www.wooplans.com/api/mcp/<MCP_TOKEN>` — à garder secret, et à changer (`wrangler secret put MCP_TOKEN`) en cas de doute.

Exemples de demandes : « Combien de ventes cette semaine et quelle campagne a le mieux converti ? », « Ajoute la demande de M. Kamga reçue sur WhatsApp, modèle V3-037, relance jeudi », « Quelles relances dois-je faire aujourd'hui ? ».

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
