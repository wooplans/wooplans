"""
Génère public/lp/en-premium-catalogue.html, la page de vente anglaise /en/premium-catalogue
(Ghana et Kenya, décision de Tao du 28 nov. 2026 ; source : scripts/sales-page-en.source.html).

- Styles : ceux de la page française (scripts/sales-page.source.html), repris tels quels (<!-- STYLE -->).
- Mesure : PostHog + Pixel Meta (scripts/lp-measure.js), comme la page française.
- Prix : pas de FCFA affiché. Les montants en KES / GHS sont posés par src/app/en/premium-catalogue/route.ts
  selon le pays du visiteur (src/config/catalogue-en.json) ; la page statique porte ceux du Kenya.
- Pas de compte à rebours ni de jauge (pas de décision de Tao pour cette page).

Usage : python3 scripts/build-sales-page-en.py
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "sales-page-en.source.html"
FR_SOURCE = ROOT / "scripts" / "sales-page.source.html"
REQUIRED = ["var WP_VARIANT='en'", "data-wp-count", "data-wp-gallery", "data-wp-preview", 'id="ckForm"', "/api/checkout", "lang:'en'", "237694327885", 'class="ckform ph-no-capture"', "data-en-price"]

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
# Bandeau de consentement (visiteurs d'Europe, dont la diaspora) en anglais.
CONSENT_EN = {
    "\"Mesure d'audience\"": "\"Audience measurement\"",
    "Nous mesurons l'utilisation du site (pages vues, clics, enregistrements anonymisés de navigation) pour l'améliorer. Aucune saisie n'est enregistrée.":
        "We measure how the site is used (page views, clicks, anonymised browsing recordings) to improve it. Nothing you type is recorded.",
    "En savoir plus": "Learn more",
    ">Refuser<": ">Decline<",
    ">Accepter<": ">Accept<",
}
for fr_text, en_text in CONSENT_EN.items():
    if fr_text not in measure:
        raise SystemExit(f"texte du bandeau introuvable : {fr_text[:40]}")
    measure = measure.replace(fr_text, en_text)

fr = FR_SOURCE.read_text(encoding="utf-8")
style = re.search(r"<style>.*?</style>", fr, re.S)
if not style:
    raise SystemExit("styles de la page française introuvables")

s = SOURCE.read_text(encoding="utf-8")
for marker in ("<!-- STYLE -->", "<!-- MESURE -->"):
    if marker not in s:
        raise SystemExit(f"emplacement {marker} introuvable")
s = s.replace("<!-- STYLE -->", style.group(0))
s = s.replace("<!-- MESURE -->", "<script>\n" + measure + "</script>")
for marker in REQUIRED:
    if marker not in s:
        raise SystemExit(f"élément manquant : {marker}")
# Garde-fous : pas de FCFA ni de vocabulaire français ou interdit sur la page anglaise.
for forbidden in ("FCFA", "Duplex", "duplex", "cpbook.wooplans.com", "expires in", "clarity.ms"):
    if forbidden in s.replace("cpbook-premium-2026", ""):
        raise SystemExit(f"mention interdite sur la page anglaise : {forbidden}")

cfg = json.loads((ROOT / "src" / "config" / "catalogue-en.json").read_text(encoding="utf-8"))
s = s.replace("{{PRIX_XAF}}", str(int(cfg["priceXaf"])))
if "{{" in s:
    raise SystemExit("repère non remplacé : " + s[s.index("{{"):][:40])

out = ROOT / "public" / "lp" / "en-premium-catalogue.html"
out.write_text(s, encoding="utf-8")
print(f"OK → {out.relative_to(ROOT)} ({len(s)} octets)")
