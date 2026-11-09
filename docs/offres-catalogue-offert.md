# Offres « Plan et devis + Catalogue Premium offert »

Sur chaque fiche modèle, le client achète le plan et devis du modèle et reçoit en bonus l'accès au Catalogue
Premium. Après paiement, il entre dans son Espace Premium : le modèle choisi l'attend dans « Fiches PDF »,
hors quota de téléchargements.

## Les trois offres

Fichier `src/config/offres.json` :

| Offre | Prix | Produit Chariow | Pays (sans lien de pub) |
|---|---|---|---|
| `39k` | 39 000 FCFA | à renseigner | CI |
| `29k` | 29 000 FCFA | à renseigner | GN |
| `19k` | 19 000 FCFA | à renseigner | CM |

- `default` : offre des pays absents des listes (39k).
- `anchor` : prix barré facultatif (null = pas de prix barré).
- Une offre **sans produit Chariow est inactive** : ses visiteurs gardent l'ancien plan et devis seul (14 900),
  sans bonus annoncé. Rien ne change sur le site tant qu'aucun produit n'est renseigné.

## Choix de l'offre d'un visiteur

1. Le lien de la pub : `https://wooplans.com/catalogue/villa-v4-005?offre=29k` (gardé 30 jours dans le navigateur).
2. Sinon son pays (liste `countries`).
3. Sinon l'offre par défaut.

Le même choix fixe le prix affiché sur la fiche et le produit Chariow payé.

## Mise en route

1. Créer sur Chariow un produit par prix, du même type que « Plan et devis Wooplans » (Licence), pour que le site
   transmette le modèle choisi au paiement. Le produit « Catalogue Premium » actuel n'est pas touché.
2. Ajouter ces produits à la notification (Pulse) Chariow « vente réussie / abandonnée / échouée » du site.
3. Copier l'identifiant de chaque produit (`prd_…`) dans `chariowProductId`.
4. Tester un achat sur l'aperçu de la branche avant la mise en ligne.

## Ce qui se passe au paiement

- Accès Premium ouvert (code par email), modèle inscrit dans « Fiches PDF » (`pdf_downloads`, marque `achat:<vente>`).
- Page /merci : bouton « Accéder à mon plan et devis » qui connecte directement l'acheteur (même navigateur).
- Fiche CRM du modèle (étape « demande ») et alerte au propriétaire, comme pour le plan et devis seul.
- Paiement par Chariow uniquement (pas Wajub). Pas de séquence de relance du catalogue en cas d'abandon.
