# Guide WooPlans des maisons (lead magnet payant, 1 900 FCFA)

Le produit d'entrée du tunnel : un PDF avec chaque modèle (rendu 3D, chambres, niveaux, surface, terrain conseillé,
budget estimé), classé par budget. Il qualifie les acheteurs (email + WhatsApp + 3 questions) et mène au
Catalogue Premium (29 000 FCFA, prix plein, sans déduction), puis aux plans complets.

```
Pub Facebook ──▶ /guide-des-maisons ──▶ paiement Chariow 1 900 ──▶ /guide-des-maisons/merci
                                                                     │ téléchargement du PDF
                                                                     │ 3 questions (terrain, démarrage, budget)
                                                                     │   terrain + < 6 mois ─▶ fiche CRM « demande » + alerte → Tao écrit sur WhatsApp
                                                                     │ vidéo du Catalogue Premium imprimé ─▶ /catalogue-premium
                                                                     ▼
                                     email de livraison + séquence « guide » (7 emails sur 10 jours) ─▶ Catalogue Premium
```

## Fichiers

| Rôle | Fichier |
|---|---|
| Réglages (prix, produit Chariow, vidéos, nombre annoncé) | `src/config/guide.json` |
| Règles (questions, lead chaud, séquence) | `src/lib/guide-rules.ts` |
| Page de vente / remerciement | `src/app/(site)/guide-des-maisons/` |
| Paiement, statut, PDF, réponses | `src/app/api/guide/` |
| Vente Chariow → livraison + séquence | `processGuideSale` dans `src/lib/chariow.ts` |
| Emails | `guideDeliveryEmail`, `guideSequenceEmail`, `guideHotLeadAdminEmail` dans `src/lib/email.ts` |
| PDF | `scripts/guide/fetch_plans.py` + `scripts/guide/build_guide.py`, workflow `guide-pdf` |

Le guide n'utilise que les données publiques du site. Les distributions cotées et les devis par lots restent
réservés au Catalogue Premium (la page « Ce qu'il vous manque » montre une illustration floutée générée).

## Mise en route (dans l'ordre)

1. **Chariow** : créer le produit « Guide WooPlans des maisons », prix 1 900 FCFA, du même type que le produit
   « Plan et devis » (pour que l'API de paiement accepte le produit et transmette `intent_id`).
   Ne rien mettre en fichier à livrer sur Chariow : le site livre le PDF.
2. Ajouter ce produit au **Pulse** Chariow du site (vente réussie / abandonnée / échouée). Un seul Pulse vers
   `https://www.wooplans.com/api/webhooks/chariow` (recréé le 18 nov. 2026 avec l'Extrait du Catalogue Premium) :
   si on le recrée, copier son nouveau secret dans le secret GitHub `CHARIOW_PULSE_SECRET` puis **redéployer**
   (le Worker ne prend le secret qu'au déploiement). Filet de sécurité : les ventes payées du guide et de l'extrait
   sont aussi lues dans l'API Chariow toutes les 15 min et depuis la page merci (`src/lib/lead-sync.ts`).
3. Copier son identifiant `prd_…` dans `src/config/guide.json` → `chariowProductId`. Tant qu'il est vide, la page
   s'affiche mais le bouton indique « Bientôt disponible ».
4. **PDF** : Actions → « Guide des maisons (PDF) » → Run workflow, d'abord sans « publish » pour contrôler
   l'artefact, puis avec « publish » pour le déposer dans R2. À relancer à chaque ajout de modèles (100 annoncés).
5. **Vidéos** (facultatives, la page fonctionne sans) : `video` (Tao fait défiler le guide sur son téléphone,
   page de vente) et `catalogueVideo` (Tao feuillette le Catalogue Premium imprimé, page de remerciement).
6. **Meta** : vérifier dans le Gestionnaire d'évènements qu'un achat de test du guide remonte **un seul** Purchase
   de 1 900 XAF (Pixel de /guide-des-maisons/merci, event_id `wp_purchase_<achat>`). Si Chariow envoie aussi son
   propre Purchase pour ce produit, désactiver l'un des deux pour ne pas compter deux fois.
7. Achat de test (avec une adresse du propriétaire) : email de livraison, téléchargement, 3 questions, alerte
   « lead chaud » si terrain + démarrage dans les 6 mois.

## Mesure

- Tableau de bord : les ventes du guide sont comptées à part (`guidePurchases`, `guideRevenue`, offre « guide »),
  jamais comme des ventes du catalogue.
- « Comment nous avez-vous connu ? » : `checkout_intents.heard_from`, aussi transmis à Chariow (`heard_from`).
- Réponses aux 3 questions : `checkout_intents.qualification` (JSON) et note sur la fiche prospect.
- Un acheteur du guide reste un prospect du catalogue : la vente du guide ne le marque pas « client ».
