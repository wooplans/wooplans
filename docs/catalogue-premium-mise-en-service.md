# Wooplans : plateforme Catalogue Premium

## Comportement livré dans cette branche

- Une page commerciale principale `/abonnement`, achat unique à 39 000 FCFA. Les anciennes pages de campagne redirigent vers cette page en conservant leurs paramètres.
- Fiches publiques avec budget indicatif et bouton vers le catalogue. Les documents privés ne sont plus transmis au visiteur dans les composants React ni dans la liste publique des modèles.
- Espace `/premium` : ressources privées configurables, favoris, tableau comparatif et demandes de personnalisation.
- CRM `/admin/projects` : demandes en ligne ou ajout manuel d'une conversation hors ligne, modèle et membre associés, stade, prochain suivi, notes, honoraires, crédit catalogue et total encaissé.
- Les ventes du catalogue restent dans `/admin/tunnel`. Le chiffre d'affaires des plans complets est saisi séparément ; le crédit catalogue n'est pas un encaissement.
- Notification Chariow signée sur le corps brut, filtrée par produit, dédupliquée. Les nouvelles ventes activent un accès sans expiration et les répétitions conservent le code existant.
- Connexion administrateur avec mot de passe vérifié. La consultation publique d'un code à partir d'un email est supprimée. Limite persistante de 10 tentatives par email et tranche de 15 minutes.
- Redirections des chemins Framer connus et sitemap des modèles publiés.

## Configuration requise avant mise en ligne

1. Sauvegarder D1. Appliquer la migration `prisma/migrations/20261014090000_premium_crm/migration.sql` avec Wrangler, puis déployer la branche validée sur une adresse de prévisualisation.
2. Configurer `AUTH_SECRET` avec une valeur forte et le compte administrateur avec un mot de passe personnel. Le seed ne crée plus de mot de passe connu. Pour un compte existant, remplacer son hash avant publication ; le seed ne le réinitialise pas.
3. Dans Chariow, vérifier que `CHARIOW_PRODUCT_ID` est bien le produit vendu, que son prix est 39 000 FCFA et que ses livrables correspondent à la page. Ne pas changer le prix de la plateforme de paiement implicitement.
4. Configurer le Pulse de ventes vers `/api/webhooks/chariow`. Copier son secret `whsec_...` dans `CHARIOW_PULSE_SECRET`, différent de la clé API. Si le secret ou le produit manque, le webhook retourne 503 sans activation. Les tests sans identifiant de livraison n'activent pas de membre.
5. Livraison des identifiants : une clé de licence reçue de Chariow est acceptée à la connexion. Configurer sa livraison au client dans la commande. S'il n'y a pas de licence, le code généré doit être transmis de manière privée par l'administration : aucun envoi email ou WhatsApp de ce code n'est ajouté dans cette branche. Vérifier ce parcours avec une commande réelle de test avant ouverture.
6. Uploader les vrais fichiers finaux dans un stockage R2 privé : catalogue PDF, guide/fiche comparative et trois vidéos. Renseigner `CATALOGUE_PDF_KEY`, `PREMIUM_GUIDE_KEY`, `PREMIUM_VIDEO_CHOIX_KEY`, `PREMIUM_VIDEO_PLANS_KEY`, `PREMIUM_VIDEO_DEVIS_KEY`. Ne pas annoncer des bonus non livrés. Les clés absentes affichent une instruction de récupération via la commande/support, sans faux téléchargement.
7. Importer les vrais modèles et leurs documents. Les fichiers de démonstration ne constituent pas une collection commerciale de 50 modèles. Les distributions/devis hébergés ailleurs sur des URL publiques doivent être déplacés dans R2 privé ; le contrôle d'accès du site ne protège pas un hébergement externe public. Purger d'éventuels caches de documents servis publiquement avant cette correction.
8. Fixer et publier les conditions de remboursement, livrables des plans complets, tarifs et règle de crédit catalogue. La branche ne promet ni garantie chiffrée non validée ni déduction automatique. Le crédit est saisi dans chaque devis/projet, limité au prix convenu, à vérifier contre l'achat réellement payé et les crédits déjà utilisés.
9. Vérifier les anciennes URL contre les modèles importés. Une redirection ne suffit pas si le slug de destination n'existe pas. Reprendre les pages Contact, mentions et conditions existantes avant la bascule Framer. Les accès historiques avec une date d'expiration ne sont pas convertis rétroactivement par cette migration.
10. Faire une vérification mobile et bureau, tester paiement, livraison, connexion, révocation et CRM en prévisualisation. La compilation ne remplace pas cette recette visuelle ni un test Cloudflare/D1 réel.

## Mesure

Utiliser une page unique et des UTM par réseau/campagne. `utm_source=facebook&utm_medium=paid_social` est classé en Facebook Ads ; un lien organique Facebook ou `fbclid` seul n'est pas une preuve de publicité payante. La catégorie « organique » existante regroupe aussi le trafic direct et non attribué. Les revenus non rattachables à une session ne doivent pas être interprétés comme une attribution complète.

Le CRM est un premier suivi des projets : les encaissements sont un total corrigible, avec dates/références dans les notes. Ce n'est pas encore un grand livre de paiements ni une comptabilité. Les remboursements/révocations restent à traiter par désactivation du membre dans l'administration ; vérifier ces situations avec le prestataire avant d'automatiser davantage.

## Vérifications reproductibles

- `npm ci`
- `npm test` : base SQLite jetable créée à partir des migrations ; signatures, répétitions, authentification, documents privés, révocation et contraintes de crédit.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build:cloudflare`

Le projet conserve son adaptateur Cloudflare Pages actuel pour limiter la portée de cette branche. `@cloudflare/next-on-pages` est déprécié ; prévoir une migration du runtime dans une tâche distincte, avec recette sur Cloudflare, sans la confondre avec la refonte commerciale.

Sources de l'intégration : https://chariow.dev/en/guides/pulse-security et https://chariow.dev/en/guides/pulses.
