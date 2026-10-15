"""
Variante B de la page de vente : page entièrement repensée pour l'acheteur mobile
(scripts/sales-page-b.source.html, écrite à la main, sans dépendance à la page A).

Structure : promesse et prix → aperçu réel d'un modèle (ce que l'on débloque) → modèles
avec leur budget → témoignages → étapes → pour qui / valeur → offre → FAQ → appel final,
avec barre collante, WhatsApp et paiement Chariow Snap guidé (aide Mobile Money).
Urgence, avis et prix barré conservés (décision du propriétaire).

Zones dynamiques remplies par src/app/catalogue-premium/route.ts (HTMLRewriter, données D1) :
- [data-wp-count] : nombre de modèles publiés ;
- [data-wp-gallery] : modèles en vedette (rendu de couverture, caractéristiques, budget) ;
- [data-wp-preview] : aperçu d'un vrai modèle (rendu, caractéristiques, postes du devis masqués).
"""
from pathlib import Path

SOURCE = Path(__file__).resolve().parent / "sales-page-b.source.html"
REQUIRED = [
    "var WP_VARIANT='b'",
    'data-product-id="prd_41k85hc0"',
    "data-wp-count",
    "data-wp-gallery",
    "data-wp-preview",
    "widget_ready",
    "237694327885",
]


def build(_page_a: str = "") -> str:
    s = SOURCE.read_text(encoding="utf-8")
    for marker in REQUIRED:
        if marker not in s:
            raise SystemExit(f"[variante B] élément manquant : {marker}")
    for forbidden in ("50+", "237653769998", "Télécharger le Catalogue"):
        if forbidden in s:
            raise SystemExit(f"[variante B] mention interdite : {forbidden}")
    return s
