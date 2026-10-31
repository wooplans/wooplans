"""
Génère public/lp/catalogue-premium.html, la page de vente /catalogue-premium
(source écrite à la main : scripts/sales-page.source.html).

Page pensée pour l'acheteur mobile. Structure : promesse, VSL et prix promotionnel (prix normal barré,
src/config/catalogue.json « priceBefore ») → témoignages → parcours en 3 étapes → modèles avec leur budget
→ aperçu réel d'un modèle → pour qui / valeur
→ offre → FAQ → appel final, avec barre collante, WhatsApp et paiement en formulaire court
(nom, email, numéro) puis page Chariow. Urgence, avis et prix barré conservés (décision du propriétaire).

Zones dynamiques remplies par src/app/catalogue-premium/route.ts (HTMLRewriter, données D1) :
- [data-wp-count] : nombre de modèles publiés ;
- [data-wp-gallery] : modèles en vedette (rendu de couverture, caractéristiques, budget) ;
- [data-wp-preview] : aperçu d'un vrai modèle (rendu, caractéristiques, postes du devis masqués).

Appliqué ici :
- mesure du comportement : PostHog + Pixel Meta (scripts/lp-measure.js, clé lue dans wrangler.jsonc),
  bandeau de consentement pour l'Europe, formulaire de paiement exclu des enregistrements ;
- prix du catalogue et montants qui en découlent (src/config/catalogue.json, src/lib/custom-plans.ts).

L'ancienne variante A a été retirée : la page garde le marqueur « b » (WP_VARIANT, cta_id « …@b »,
« variant_b ») pour que ses statistiques restent continues dans le tableau de bord.

Usage : python3 scripts/build-sales-page.py
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "sales-page.source.html"
REQUIRED = [
    "var WP_VARIANT='b'",
    "data-wp-count",
    "data-wp-gallery",
    "data-wp-preview",
    'id="ckForm"',
    "/api/checkout",
    "237694327885",
    'class="ckform ph-no-capture"',
    "wpCapture",
]

# Mesure : Pixel Meta + PostHog (consentement en Europe)
wrangler = (ROOT / "wrangler.jsonc").read_text(encoding="utf-8")
def wrangler_var(name: str) -> str:
    m = re.search(rf'"{name}"\s*:\s*"([^"]*)"', wrangler)
    return m.group(1) if m else ""
ph_key = wrangler_var("POSTHOG_KEY")
ph_host = wrangler_var("POSTHOG_HOST") or "https://eu.i.posthog.com"
if not re.fullmatch(r"(phc_[A-Za-z0-9]+)?", ph_key) or not re.fullmatch(r"https://[a-z0-9.-]+", ph_host):
    raise SystemExit("POSTHOG_KEY ou POSTHOG_HOST invalide dans wrangler.jsonc")
measure = (ROOT / "scripts" / "lp-measure.js").read_text(encoding="utf-8")
measure = measure.replace("__POSTHOG_KEY__", ph_key).replace("__POSTHOG_HOST__", ph_host)

s = SOURCE.read_text(encoding="utf-8")
if "<!-- MESURE -->" not in s:
    raise SystemExit("emplacement <!-- MESURE --> introuvable")
s = s.replace("<!-- MESURE -->", "<!-- Mesure : Pixel Meta et PostHog chargés après interaction ou inactivité, avec consentement en Europe. -->\n<script>\n" + measure + "</script>")
for marker in REQUIRED:
    if marker not in s:
        raise SystemExit(f"élément manquant : {marker}")
for forbidden in ("50+", "237653769998", "Télécharger le Catalogue", "clarity.ms"):
    if forbidden in s:
        raise SystemExit(f"mention interdite : {forbidden}")

# Prix du catalogue et montants qui en découlent. Source unique : src/config/catalogue.json
# (lue aussi par le site et la VSL) ; prix des plans complets : src/lib/custom-plans.ts.
CATALOGUE = json.loads((ROOT / "src" / "config" / "catalogue.json").read_text(encoding="utf-8"))
PRICE = int(CATALOGUE["price"])
PRICE_BEFORE = int(CATALOGUE["priceBefore"])  # prix normal, barré : le prix actuel est promotionnel
VALUE = 500000  # valeur affichée du catalogue (tableau de valeur)
plan_prices = [int(x) for x in re.findall(r"price: (\d+)", (ROOT / "src" / "lib" / "custom-plans.ts").read_text(encoding="utf-8"))]
if len(plan_prices) != 2 or not 0 < PRICE < PRICE_BEFORE:
    raise SystemExit("prix du catalogue ou des plans complets introuvable ou incohérent")
villa, duplex = plan_prices

def fcfa(n: int, sep: str = " ") -> str:
    return f"{n:,}".replace(",", sep)

PRICE_TOKENS = {
    "{{PRIX}}": fcfa(PRICE),
    "{{PRIX_NBSP}}": fcfa(PRICE, "&nbsp;"),
    "{{PRIX_XAF}}": str(PRICE),
    "{{RESTE_VILLA_NBSP}}": fcfa(villa - PRICE, "&nbsp;"),
    "{{RESTE_DUPLEX_NBSP}}": fcfa(duplex - PRICE, "&nbsp;"),
    "{{PRIX_AVANT}}": fcfa(PRICE_BEFORE),
    "{{PRIX_AVANT_NBSP}}": fcfa(PRICE_BEFORE, "&nbsp;"),
    "{{REMISE}}": str(round((PRICE_BEFORE - PRICE) / PRICE_BEFORE * 100)),
    "{{PART_VALEUR}}": f"{PRICE / VALUE * 100:.1f}",
    "{{ECONOMIE}}": fcfa(PRICE_BEFORE - PRICE),
    "{{ECONOMIE_VALEUR}}": fcfa(VALUE - PRICE),
    # Repli si la base est indisponible (sinon la route calcule le prix réel par modèle) : 60 modèles et plus.
    "{{PAR_MODELE_MAX}}": str(-(-PRICE // 60 // 50) * 50),
}
for token, value in PRICE_TOKENS.items():
    s = s.replace(token, value)
if "{{" in s:
    raise SystemExit("repère de prix non remplacé : " + s[s.index("{{"):][:40])

out = ROOT / "public" / "lp" / "catalogue-premium.html"
out.write_text(s, encoding="utf-8")
print(f"OK → {out.relative_to(ROOT)} ({len(s)} octets)")
