"""
Génère public/lp/catalogue-physique.html, la page de vente /catalogue-physique : le Catalogue Premium
imprimé, vendu au Cameroun et commandé sur WhatsApp (source écrite à la main : scripts/physical-page.source.html).

Réglages : src/config/catalogue-physique.json
- price : prix affiché (FCFA) ; models : nombre de plans dans le livre ; whatsapp : numéro des commandes ;
- video : clé de la vidéo du livre feuilleté dans le bucket VIDEOS (ex. "catalogue-physique/feuilletage.mp4",
  servie sous /videos/<clé>) ; videoPoster : image affichée avant la lecture (ex. "/assets/physique/poster.webp") ;
- photos : photos du livre imprimé (fichiers dans public/assets/physique/), avec leur légende.
Tant qu'une vidéo ou une photo manque, la page affiche un emplacement réservé, et ce script le signale.

Zones remplies par src/app/catalogue-physique/route.ts (HTMLRewriter, données D1) :
- [data-wp-top] : les 20 modèles phares (rendu, caractéristiques, budget ; visionneuse de tous les rendus) ;
- [data-wp-more] : les autres modèles publiés, en vignettes (le titre garde le nombre du livre : models - 20).

Commande : formulaire (nom, WhatsApp, ville, quartier, projet, échéance) → /api/commande-catalogue
(fiche CRM « Catalogue imprimé ») → WhatsApp avec le message prérempli ; sur ordinateur, QR code à scanner.

Usage : python3 scripts/build-physical-page.py
"""
from html import escape
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "physical-page.source.html"
CFG = json.loads((ROOT / "src" / "config" / "catalogue-physique.json").read_text(encoding="utf-8"))
PRICE, MODELS, WA = int(CFG["price"]), int(CFG["models"]), str(CFG["whatsapp"])
TOP = 20
if not re.fullmatch(r"237[26]\d{8}", WA) or PRICE <= 0 or MODELS <= TOP:
    raise SystemExit("catalogue-physique.json : prix, nombre de modèles ou numéro WhatsApp invalide")

# Mesure : Pixel Meta + PostHog (mêmes réglages que la page de vente numérique)
wrangler = (ROOT / "wrangler.jsonc").read_text(encoding="utf-8")
def wrangler_var(name: str) -> str:
    m = re.search(rf'"{name}"\s*:\s*"([^"]*)"', wrangler)
    return m.group(1) if m else ""
ph_key = wrangler_var("POSTHOG_KEY")
ph_host = wrangler_var("POSTHOG_HOST") or "https://eu.i.posthog.com"
if not re.fullmatch(r"(phc_[A-Za-z0-9]+)?", ph_key) or not re.fullmatch(r"https://[a-z0-9.-]+", ph_host):
    raise SystemExit("POSTHOG_KEY ou POSTHOG_HOST invalide dans wrangler.jsonc")
measure = (ROOT / "scripts" / "lp-measure.js").read_text(encoding="utf-8").replace("__POSTHOG_KEY__", ph_key).replace("__POSTHOG_HOST__", ph_host)

s = SOURCE.read_text(encoding="utf-8")
s = s.replace("<!-- MESURE -->", "<!-- Mesure : Pixel Meta et PostHog chargés après interaction ou inactivité, avec consentement en Europe. -->\n<script>\n" + measure + "</script>")

missing = []
DEFAULT_POSTER = "/assets/digital/catalogue-premium-mockup-540.webp"

def asset_ok(src: str) -> bool:
    return bool(src) and src.startswith("/") and (ROOT / "public" / src.lstrip("/")).is_file()

# Vidéo du livre feuilleté (hero)
video, poster = str(CFG.get("video") or ""), str(CFG.get("videoPoster") or "")
if poster and not asset_ok(poster):
    raise SystemExit(f"videoPoster introuvable dans public/ : {poster}")
poster = poster or DEFAULT_POSTER
if video:
    if not re.fullmatch(r"[a-z0-9][a-z0-9/_-]*\.mp4", video, re.I):
        raise SystemExit("video : clé du bucket VIDEOS attendue, ex. catalogue-physique/feuilletage.mp4")
    hero = (f'<div class="vsl" id="vsl"><video src="/videos/{escape(video)}#t=0.1" poster="{escape(poster)}" playsinline preload="metadata"></video>'
            '<button type="button" class="play" onclick="playHero()" aria-label="Lire la vidéo"><i></i>Voir le livre feuilleté</button></div>')
else:
    missing.append("vidéo du livre feuilleté (video)")
    hero = (f'<div class="vsl" id="vsl"><img src="{escape(poster)}" alt="Catalogue Premium WOOPLANS imprimé" width="540" height="675" fetchpriority="high">'
            '<p class="soon">🎬 Emplacement de la vidéo : le livre feuilleté page par page</p></div>')
s = s.replace("<!-- VIDEO -->", hero)

# Photos du livre
figures = []
for i, photo in enumerate(CFG.get("photos") or []):
    src, caption = str(photo.get("src") or ""), str(photo.get("caption") or "")
    if src and not asset_ok(src):
        raise SystemExit(f"photo introuvable dans public/ : {src}")
    if not src:
        missing.append(f"photo « {caption} »")
        figures.append(f'<figure><img src="{DEFAULT_POSTER}" alt="" width="540" height="405" loading="lazy" style="opacity:.35"><figcaption>📷 Photo à venir : {escape(caption)}</figcaption></figure>')
    else:
        figures.append(f'<figure><img src="{escape(src)}" alt="{escape(caption)}" width="800" height="600" loading="lazy" decoding="async"><figcaption>{escape(caption)}</figcaption></figure>')
s = s.replace("<!-- PHOTOS -->", "\n      ".join(figures))

# Prix des plans complets (FAQ) : src/lib/custom-plans.ts
plan_prices = [int(x) for x in re.findall(r"price: (\d+)", (ROOT / "src" / "lib" / "custom-plans.ts").read_text(encoding="utf-8"))]
if len(plan_prices) != 2:
    raise SystemExit("prix des plans complets introuvables")
villa, duplex = plan_prices

def fcfa(n: int, sep: str = " ") -> str:
    return f"{n:,}".replace(",", sep)

TOKENS = {
    "{{PRIX}}": fcfa(PRICE),
    "{{PRIX_NBSP}}": fcfa(PRICE, "&nbsp;"),
    "{{PRIX_XAF}}": str(PRICE),
    "{{MODELES}}": str(MODELS),
    "{{AUTRES}}": str(MODELS - TOP),
    "{{WHATSAPP}}": WA,
    "{{HERO_POSTER}}": poster,
    "{{IMAGE_PARTAGE}}": poster,
    "{{PRIX_VILLA_NBSP}}": fcfa(villa, "&nbsp;"),
    "{{PRIX_DUPLEX_NBSP}}": fcfa(duplex, "&nbsp;"),
}
for token, value in TOKENS.items():
    s = s.replace(token, value)
if "{{" in s:
    raise SystemExit("repère non remplacé : " + s[s.index("{{"):][:40])

for marker in ("data-wp-top", "data-wp-more", "/api/commande-catalogue", 'class="form ph-no-capture"', "wpCapture", "var WP_VARIANT='physique'"):
    if marker not in s:
        raise SystemExit(f"élément manquant : {marker}")
# Règles des pages de vente : ancien numéro, mentions de « 50 » plans, urgence inventée.
for forbidden in ("237653769998", "50 plans", "50+", "expire", "clarity.ms", "cpbook.wooplans.com"):
    if forbidden in s:
        raise SystemExit(f"mention interdite : {forbidden}")

import html as _html
def _plain(fragment: str) -> str:
    return re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", fragment))).replace(" ", " ").strip()
faq_block = s[s.index('<div class="faq">'):]
questions = [
    {"@type": "Question", "name": _plain(q), "acceptedAnswer": {"@type": "Answer", "text": _plain(a)}}
    for q, a in re.findall(r"<details[^>]*><summary>(.*?)</summary>(.*?)</details>", faq_block, re.S)
]
ld = [
    {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Catalogue Premium WOOPLANS imprimé",
        "description": f"Livre imprimé de {MODELS} plans de villas et duplex avec rendus 3D, plans cotés et devis détaillés par poste. Livraison gratuite à Yaoundé et Douala.",
        "image": "https://www.wooplans.com" + poster,
        "brand": {"@type": "Brand", "name": "WOOPLANS"},
        "offers": {"@type": "Offer", "url": "https://www.wooplans.com/catalogue-physique", "price": str(PRICE), "priceCurrency": "XAF",
                   "availability": "https://schema.org/InStock", "areaServed": "CM"},
    },
    {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": questions},
]
s = s.replace("<!-- JSONLD -->", "\n".join(
    '<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>" for x in ld))

out = ROOT / "public" / "lp" / "catalogue-physique.html"
out.write_text(s, encoding="utf-8")
print(f"OK → {out.relative_to(ROOT)} ({len(s)} octets)")
for m in missing:
    print(f"  emplacement réservé : {m}")
