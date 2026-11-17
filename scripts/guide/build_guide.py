#!/usr/bin/env python3
"""Fabrique le PDF « Guide WooPlans des maisons » (lead magnet payant, 1 900 FCFA).

Prérequis : python scripts/guide/fetch_plans.py (données publiques + rendus dans scripts/guide/cache/).
Usage    : python scripts/guide/build_guide.py [--out guide-wooplans-des-maisons.pdf]

Contenu : données publiques du site (rendu, chambres, niveaux, surface, terrain conseillé, budget indicatif), plus
un ÉCHANTILLON du Catalogue Premium : 2 vraies pages A3 du catalogue (D4-034 et V3-038, scripts/guide/sample/),
insérées en A4 paysage (décision de Tao, 17 nov. 2026). Les distributions et devis des autres modèles restent réservés au catalogue.
"""
from __future__ import annotations

import argparse
import io
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE / "cache"

# Charte WooPlans (« color palette wooplans.txt »)
PRIMARY = HexColor("#0F5B59")
ACCENT = HexColor("#F08A2E")
HIGHLIGHT = HexColor("#E7C36C")
DARK = HexColor("#1E2933")
BG = HexColor("#F5F7F9")
MUTED = HexColor("#6B7280")
LINE = HexColor("#E3E7EB")

W, H = A4
M = 16 * mm  # marge

ANNOUNCED_MODELS = 100  # nombre annoncé dans les publicités et la page de vente
SITE = "wooplans.com"
UTM = "utm_source=guide&utm_medium=pdf&utm_campaign=guide_maisons"
CATALOGUE_URL = f"https://wooplans.com/catalogue-premium?{UTM}"
CATALOGUE_PRICE = "29 000 FCFA"
WHATSAPP = "237694327885"
WHATSAPP_URL = (
    f"https://wa.me/{WHATSAPP}?text="
    "Bonjour%20Tao%2C%20j%27ai%20le%20Guide%20WooPlans%20des%20maisons.%20J%27ai%20un%20terrain%20et%20je%20veux%20d%C3%A9marrer%20mon%20projet."
)

BRACKETS = [
    ("Moins de 15 millions", 0, 15_000_000),
    ("De 15 à 25 millions", 15_000_000, 25_000_000),
    ("De 25 à 40 millions", 25_000_000, 40_000_000),
    ("De 40 à 70 millions", 40_000_000, 70_000_000),
    ("Plus de 70 millions", 70_000_000, 10**12),
]


# ---------------------------------------------------------------- polices
def register_fonts():
    fonts_dir = ROOT / "src" / "app" / "fonts"
    out = CACHE / "fonts"
    out.mkdir(parents=True, exist_ok=True)
    try:
        from fontTools.ttLib import TTFont as FT

        for w in (600, 700, 800):
            ttf = out / f"Montserrat-{w}.ttf"
            if not ttf.exists():
                f = FT(str(fonts_dir / f"montserrat-latin-{w}-normal.woff2"))
                f.flavor = None
                f.save(str(ttf))
        pdfmetrics.registerFont(TTFont("Head", str(out / "Montserrat-800.ttf")))
        pdfmetrics.registerFont(TTFont("Head7", str(out / "Montserrat-700.ttf")))
        pdfmetrics.registerFont(TTFont("Semi", str(out / "Montserrat-600.ttf")))
    except Exception as e:  # noqa: BLE001
        print("Montserrat indisponible (pip install fonttools brotli) :", e)
        pdfmetrics.registerFont(TTFont("Head", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
        pdfmetrics.registerFont(TTFont("Head7", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
        pdfmetrics.registerFont(TTFont("Semi", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
    body = [
        ("/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf", "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"),
        ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for reg, bold in body:
        if Path(reg).exists():
            pdfmetrics.registerFont(TTFont("Body", reg))
            pdfmetrics.registerFont(TTFont("BodyB", bold))
            return
    raise SystemExit("Aucune police de texte trouvée")


# ---------------------------------------------------------------- outils
def millions(v: float) -> str:
    s = f"{v / 1_000_000:.1f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s


def budget_label(p) -> str:
    return f"{millions(p['budgetMin'])} à {millions(p['budgetMax'])} M FCFA"


def mid(p) -> float:
    return (p["budgetMin"] + p["budgetMax"]) / 2


def m2(v) -> str:
    return f"{int(round(v))} m²"


def para(c: canvas.Canvas, text: str, x, y, width, font="Body", size=11, leading=None, color=DARK) -> float:
    leading = leading or size * 1.38
    c.setFont(font, size)
    c.setFillColor(color)
    for line in simpleSplit(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def footer(c: canvas.Canvas, n: int):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(M, 12 * mm, W - M, 12 * mm)
    c.setFont("Semi", 7.5)
    c.setFillColor(MUTED)
    c.drawString(M, 8 * mm, "Guide WooPlans des maisons")
    c.drawRightString(W - M, 8 * mm, f"{SITE}  ·  {n}")


def title_block(c, kicker: str, title: str, y=None) -> float:
    y = y if y is not None else H - M - 6 * mm
    c.setFont("Semi", 9)
    c.setFillColor(ACCENT)
    c.drawString(M, y, kicker.upper())
    y -= 11 * mm
    for line in simpleSplit(title, "Head", 24, W - 2 * M):
        c.setFont("Head", 24)
        c.setFillColor(PRIMARY)
        c.drawString(M, y, line)
        y -= 10 * mm
    return y - 2 * mm


def rounded_image(c, path, x, y, w, h, radius=4 * mm):
    """Image recadrée (cover) dans un rectangle arrondi."""
    im = Image.open(path)
    target = w / h
    r = im.width / im.height
    if r > target:
        nw = int(im.height * target)
        im = im.crop(((im.width - nw) // 2, 0, (im.width - nw) // 2 + nw, im.height))
    else:
        nh = int(im.width / target)
        im = im.crop((0, (im.height - nh) // 2, im.width, (im.height - nh) // 2 + nh))
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=74, optimize=True)
    buf.seek(0)
    c.saveState()
    p = c.beginPath()
    p.roundRect(x, y, w, h, radius)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(ImageReader(buf), x, y, w, h)
    c.restoreState()


def chip(c, x, y, label, value, w):
    c.setFillColor(BG)
    c.roundRect(x, y, w, 13 * mm, 2.5 * mm, stroke=0, fill=1)
    c.setFont("Body", 7.5)
    c.setFillColor(MUTED)
    c.drawString(x + 3 * mm, y + 8.3 * mm, label)
    c.setFont("Head7", 10)
    c.setFillColor(DARK)
    c.drawString(x + 3 * mm, y + 3 * mm, value)


def button(c, x, y, w, h, text, url, fill=ACCENT, color=white, size=12):
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, h / 2, stroke=0, fill=1)
    c.setFont("Head7", size)
    c.setFillColor(color)
    c.drawCentredString(x + w / 2, y + h / 2 - size * 0.35, text)
    c.linkURL(url, (x, y, x + w, y + h), relative=0)


def bullet_list(c, items, x, y, width, size=11, gap=2.5 * mm, color=DARK, dot=ACCENT):
    for it in items:
        c.setFillColor(dot)
        c.circle(x + 1.3 * mm, y + 1.3 * mm, 1.2 * mm, stroke=0, fill=1)
        y = para(c, it, x + 5 * mm, y, width - 5 * mm, size=size, color=color) - gap
    return y


# ---------------------------------------------------------------- illustrations floutées (générées)
def blurred_preview() -> ImageReader:
    """Distribution et devis fictifs, dessinés puis floutés : aucune donnée Premium réelle."""
    rnd = random.Random(7)
    im = Image.new("RGB", (1400, 760), "white")
    d = ImageDraw.Draw(im)
    # « plan » fictif
    d.rectangle((40, 40, 760, 720), outline=(30, 41, 51), width=10)
    for x in (300, 520):
        d.line((x, 40, x, 720), fill=(30, 41, 51), width=7)
    for yy in (260, 470):
        d.line((40, yy, 760, yy), fill=(30, 41, 51), width=7)
    for _ in range(14):
        x, yy = rnd.randint(70, 700), rnd.randint(70, 680)
        d.text((x, yy), "0,00 m", fill=(15, 91, 89))
    # « devis » fictif
    for i in range(8):
        y0 = 70 + i * 80
        d.rectangle((820, y0, 820 + rnd.randint(260, 520), y0 + 36), fill=(15, 91, 89))
        d.rectangle((1180, y0, 1360, y0 + 36), fill=(231, 195, 108))
    im = im.filter(ImageFilter.GaussianBlur(14))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=70)
    buf.seek(0)
    return ImageReader(buf)


# ---------------------------------------------------------------- pages
def page_cover(c, plans):
    hero = max(plans, key=lambda p: p["surfaceTotal"] if p["category"] == "duplex" else 0)
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    ih = (W - 2 * M) / 1.78
    rounded_image(c, ROOT / "scripts/guide" / hero["image"], M, H - 30 * mm - ih, W - 2 * M, ih, 6 * mm)
    y = H - 30 * mm - ih - 22 * mm
    c.setFont("Semi", 11)
    c.setFillColor(HIGHLIGHT)
    c.drawString(M, y, "WOOPLANS")
    y -= 15 * mm
    c.setFont("Head", 34)
    c.setFillColor(white)
    c.drawString(M, y, "Le Guide WooPlans")
    y -= 13 * mm
    c.drawString(M, y, "des maisons")
    y -= 12 * mm
    y = para(c, f"{ANNOUNCED_MODELS} villas et duplex, avec la surface, le terrain nécessaire et le budget de construction de chacun.",
             M, y, W - 2 * M - 20 * mm, font="Semi", size=13, color=white, leading=18)
    c.setFont("Body", 10)
    c.setFillColor(HexColor("#CFE3E2"))
    c.drawString(M, 18 * mm, f"Édition 2026  ·  {SITE}")


def page_how_to(c, plans, n):
    y = title_block(c, "Mode d'emploi", "Trouvez votre maison en 3 étapes")
    steps = [
        ("1", "Repérez votre budget",
         "Les modèles sont classés par budget de construction, du plus accessible au plus haut de gamme. "
         "Allez directement à la tranche qui correspond à votre projet."),
        ("2", "Vérifiez votre terrain",
         "Chaque modèle indique la surface de terrain conseillée. Le tableau « Quel modèle pour mon terrain ? », "
         "en fin de guide, regroupe les modèles par taille de terrain."),
        ("3", "Choisissez 3 favoris",
         "Notez vos 3 modèles préférés sur la page « Mes 3 favoris ». C'est votre point de départ pour comparer "
         "les distributions et les devis détaillés."),
    ]
    for num, head, text in steps:
        c.setFillColor(PRIMARY)
        c.circle(M + 6 * mm, y - 2 * mm, 6 * mm, stroke=0, fill=1)
        c.setFont("Head", 14)
        c.setFillColor(white)
        c.drawCentredString(M + 6 * mm, y - 4.6 * mm, num)
        c.setFont("Head7", 14)
        c.setFillColor(DARK)
        c.drawString(M + 17 * mm, y - 1 * mm, head)
        y = para(c, text, M + 17 * mm, y - 8 * mm, W - 2 * M - 17 * mm, size=11) - 8 * mm

    # Sommaire par budget
    y -= 2 * mm
    c.setFont("Head7", 13)
    c.setFillColor(PRIMARY)
    c.drawString(M, y, "Dans ce guide")
    y -= 9 * mm
    for label, lo, hi in BRACKETS:
        group = [p for p in plans if lo <= mid(p) < hi]
        if not group:
            continue
        villas = sum(p["category"] == "villa" for p in group)
        duplex = len(group) - villas
        detail = " · ".join(x for x in [f"{villas} villa{'s' if villas > 1 else ''}" if villas else "",
                                         f"{duplex} duplex" if duplex else ""] if x)
        c.setFillColor(BG)
        c.roundRect(M, y - 4 * mm, W - 2 * M, 11 * mm, 2.5 * mm, stroke=0, fill=1)
        c.setFont("Semi", 11)
        c.setFillColor(DARK)
        c.drawString(M + 4 * mm, y, f"{label} de FCFA")
        c.setFont("Body", 10.5)
        c.setFillColor(MUTED)
        c.drawRightString(W - M - 4 * mm, y, detail)
        y -= 14 * mm
    y -= 2 * mm
    para(c, "Les budgets sont des estimations de construction établies par WooPlans pour chaque modèle. Ils varient selon "
            "la ville, le terrain, les matériaux et les finitions choisis.", M, y, W - 2 * M, size=9.5, color=MUTED)
    footer(c, n)


DECISIONS = [
    ("Votre terrain",
     "Avant de choisir une maison, connaissez votre terrain : sa surface, ses dimensions, son accès et sa pente. "
     "C'est lui qui fixe la taille maximale de la maison, car il faut laisser de la place autour (cour, passage, "
     "stationnement). Ayez aussi vos papiers en règle : le titre foncier est demandé pour le permis de construire."),
    ("Votre budget réel",
     "Le budget indiqué pour chaque modèle couvre les grands postes de construction, de la fondation jusqu'au carrelage. "
     "Prévoyez en plus le terrain, le permis de construire, la clôture, les raccordements (eau, électricité) et "
     "l'équipement de la maison. Gardez aussi une marge pour les imprévus."),
    ("Villa ou duplex",
     "La villa de plain-pied est simple à vivre et à construire, mais elle demande plus de terrain. Le duplex donne plus "
     "de surface sur un terrain plus petit, avec un budget plus élevé (dalle, escalier, structure). Sur un petit terrain, "
     "le duplex est souvent la bonne réponse."),
    ("Le nombre de chambres",
     "Pensez à votre famille d'aujourd'hui et à celle de dans 10 ans : enfants, parents qui viennent séjourner, "
     "bureau à la maison. Une chambre de plus coûte moins cher à prévoir maintenant qu'à ajouter plus tard."),
    ("Votre calendrier",
     "Beaucoup construisent par étapes : fondation, puis élévation, puis toiture, puis finitions. Pour cela, il faut "
     "connaître le coût de chaque étape. C'est le rôle du devis poste par poste, disponible pour chaque modèle "
     "dans le Catalogue Premium."),
]


def page_decisions(c, n):
    y = title_block(c, "Avant de choisir", "Les 5 décisions à prendre avant de construire")
    for i, (head, text) in enumerate(DECISIONS, 1):
        c.setFont("Head", 20)
        c.setFillColor(HIGHLIGHT)
        c.drawString(M, y - 4 * mm, f"{i}")
        c.setFont("Head7", 13.5)
        c.setFillColor(PRIMARY)
        c.drawString(M + 11 * mm, y - 2 * mm, head)
        y = para(c, text, M + 11 * mm, y - 9 * mm, W - 2 * M - 11 * mm, size=11) - 6 * mm
    footer(c, n)


def page_bracket_divider(c, label, group, n):
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    best = sorted(group, key=lambda p: -p["surfaceTotal"])[:3]
    ih = (W - 2 * M) / 1.78
    rounded_image(c, ROOT / "scripts/guide" / best[0]["image"], M, H - 30 * mm - ih, W - 2 * M, ih, 6 * mm)
    y = H - 30 * mm - ih - 22 * mm
    c.setFont("Semi", 11)
    c.setFillColor(HIGHLIGHT)
    c.drawString(M, y, "BUDGET DE CONSTRUCTION")
    y -= 15 * mm
    c.setFont("Head", 30)
    c.setFillColor(white)
    c.drawString(M, y, label)
    y -= 11 * mm
    c.setFont("Head7", 16)
    c.drawString(M, y, "de FCFA")
    y -= 14 * mm
    villas = sum(p["category"] == "villa" for p in group)
    duplex = len(group) - villas
    smin = min(p["surfaceTotal"] for p in group)
    smax = max(p["surfaceTotal"] for p in group)
    lines = [f"{len(group)} modèle{'s' if len(group) > 1 else ''} : "
             + " et ".join(x for x in [f"{villas} villa{'s' if villas > 1 else ''}" if villas else "",
                                       f"{duplex} duplex" if duplex else ""] if x),
             f"De {m2(smin)} à {m2(smax)} habitables"]
    for line in lines:
        c.setFont("Body", 13)
        c.setFillColor(HexColor("#CFE3E2"))
        c.drawString(M, y, line)
        y -= 7 * mm


def model_card(c, p, top):
    """Demi-page : rendu (16:9, sans recadrage du badge du site) + caractéristiques publiques."""
    x, w = M, W - 2 * M
    img_h = w / 1.78
    y_img = top - img_h
    rounded_image(c, ROOT / "scripts/guide" / p["image"], x, y_img, w, img_h)
    url = f"https://wooplans.com/catalogue/{p['slug']}?{UTM}"
    c.linkURL(url, (x, y_img, x + w, top), relative=0)
    cat = "VILLA" if p["category"] == "villa" else "DUPLEX"
    c.setFillColor(white)
    c.roundRect(x + 4 * mm, top - 11 * mm, 22 * mm, 7 * mm, 3.5 * mm, stroke=0, fill=1)
    c.setFont("Semi", 8)
    c.setFillColor(PRIMARY)
    c.drawCentredString(x + 15 * mm, top - 8.6 * mm, cat)

    y = y_img - 8 * mm
    c.setFont("Head", 16)
    c.setFillColor(DARK)
    c.drawString(x, y, p["code"])
    code_w = pdfmetrics.stringWidth(p["code"], "Head", 16)
    c.setFont("Semi", 8.5)
    c.setFillColor(ACCENT)
    link = "Voir sur wooplans.com  ›"
    c.drawString(x + code_w + 4 * mm, y + 0.6 * mm, link)
    c.linkURL(url, (x, y - 2 * mm, x + code_w + 4 * mm + pdfmetrics.stringWidth(link, "Semi", 8.5), y + 6 * mm), relative=0)
    c.setFont("Body", 8)
    c.setFillColor(MUTED)
    c.drawRightString(x + w, y + 5.2 * mm, "Budget de construction estimé")
    c.setFont("Head7", 13)
    c.setFillColor(PRIMARY)
    c.drawRightString(x + w, y - 0.6 * mm, budget_label(p))

    y -= 16 * mm
    levels = int(p["levels"])
    gap = 3 * mm
    cw = (w - 3 * gap) / 4
    chip(c, x, y, "Chambres", f"{int(p['bedrooms'])}", cw)
    chip(c, x + (cw + gap), y, "Niveaux", "Plain-pied" if levels == 1 else f"{levels} niveaux", cw)
    chip(c, x + 2 * (cw + gap), y, "Surface habitable", m2(p["surfaceTotal"]), cw)
    chip(c, x + 3 * (cw + gap), y, "Terrain conseillé", m2(p["landArea"]), cw)


def page_land_table(c, plans, n):
    y = title_block(c, "Votre terrain", "Quel modèle pour mon terrain ?")
    y = para(c, "Les modèles regroupés par surface de terrain conseillée. Un terrain plus grand accepte aussi les modèles "
                "des lignes au-dessus.", M, y, W - 2 * M, size=10.5, color=MUTED) - 4 * mm
    sizes = sorted({int(p["landArea"]) for p in plans})
    for s in sizes:
        group = sorted([p for p in plans if int(p["landArea"]) == s], key=lambda p: p["code"])
        codes = ", ".join(p["code"] for p in group)
        lines = simpleSplit(codes, "Body", 9.5, W - 2 * M - 34 * mm)
        h = max(9 * mm, (len(lines) * 4.6 + 4.4) * mm)
        if y - h < 18 * mm:
            footer(c, n)
            c.showPage()
            n += 1
            y = title_block(c, "Votre terrain", "Quel modèle pour mon terrain ? (suite)")
        c.setFillColor(BG)
        c.roundRect(M, y - h, W - 2 * M, h, 2 * mm, stroke=0, fill=1)
        c.setFont("Head7", 11)
        c.setFillColor(PRIMARY)
        c.drawString(M + 3 * mm, y - 6 * mm, f"{s} m²")
        yy = y - 6 * mm
        c.setFont("Body", 9.5)
        c.setFillColor(DARK)
        for line in lines:
            c.drawString(M + 30 * mm, yy, line)
            yy -= 4.6 * mm
        y -= h + 2.5 * mm
    footer(c, n)
    return n


def page_favorites(c, n):
    y = title_block(c, "À vous de jouer", "Mes 3 favoris")
    y = para(c, "Notez ici les 3 modèles qui vous plaisent le plus. Vous les comparerez ensuite, plan coté et devis "
                "détaillé à l'appui.", M, y, W - 2 * M, size=11, color=MUTED) - 6 * mm
    box_h = 58 * mm
    for i in range(1, 4):
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.roundRect(M, y - box_h, W - 2 * M, box_h, 3 * mm, stroke=1, fill=0)
        c.setFont("Head", 16)
        c.setFillColor(HIGHLIGHT)
        c.drawString(M + 5 * mm, y - 10 * mm, f"Favori {i}")
        fields = ["Référence du modèle :", "Pourquoi il me plaît :", "Ce que je voudrais modifier :", "Budget estimé :"]
        yy = y - 20 * mm
        for f in fields:
            c.setFont("Body", 10)
            c.setFillColor(MUTED)
            c.drawString(M + 5 * mm, yy, f)
            c.setStrokeColor(LINE)
            c.line(M + 58 * mm, yy - 1 * mm, W - M - 5 * mm, yy - 1 * mm)
            yy -= 9.5 * mm
        y -= box_h + 6 * mm
    footer(c, n)


def page_premium(c, n):
    y = title_block(c, "La suite", "Ce qu'il vous manque pour décider")
    y = para(c, "Ce guide vous montre à quoi ressemble chaque maison et combien elle coûte à construire. Pour choisir "
                "en toute confiance, il vous faut encore voir l'intérieur et le détail du budget.",
             M, y, W - 2 * M, size=11.5) - 5 * mm
    img_h = 58 * mm
    c.drawImage(blurred_preview(), M, y - img_h, W - 2 * M, img_h)
    c.setFillColor(HexColor("#1E2933"))
    c.roundRect(W / 2 - 42 * mm, y - img_h / 2 - 6 * mm, 84 * mm, 12 * mm, 6 * mm, stroke=0, fill=1)
    c.setFont("Semi", 10)
    c.setFillColor(white)
    c.drawCentredString(W / 2, y - img_h / 2 - 1.6 * mm, "Réservé au Catalogue Premium")
    y -= img_h + 9 * mm

    c.setFont("Head7", 14)
    c.setFillColor(PRIMARY)
    c.drawString(M, y, "Dans le Catalogue Premium, pour chaque modèle :")
    y -= 8 * mm
    y = bullet_list(c, [
        "Le plan de distribution coté de chaque niveau : la place de chaque pièce, avec ses dimensions.",
        "Le tableau des pièces et de leurs surfaces.",
        "Le devis estimatif poste par poste : fondation, élévations, charpente et toiture, crépissage, portes et "
        "fenêtres, plomberie et électricité, plafond et peinture, carrelage.",
        "La fiche PDF du modèle à télécharger, à montrer à votre famille ou à votre maçon.",
        "Le comparateur pour mettre 3 modèles côte à côte.",
        "L'accès à vie, nouveaux modèles inclus.",
    ], M, y, W - 2 * M, size=11)
    y -= 4 * mm
    c.setFillColor(BG)
    c.roundRect(M, y - 34 * mm, W - 2 * M, 34 * mm, 4 * mm, stroke=0, fill=1)
    c.setFont("Head", 18)
    c.setFillColor(DARK)
    c.drawString(M + 6 * mm, y - 11 * mm, "Catalogue Premium")
    c.setFont("Body", 10.5)
    c.setFillColor(MUTED)
    c.drawString(M + 6 * mm, y - 18 * mm, f"{ANNOUNCED_MODELS} modèles · paiement unique · Mobile Money ou carte")
    c.setFont("Head", 18)
    c.setFillColor(PRIMARY)
    c.drawRightString(W - M - 6 * mm, y - 11 * mm, CATALOGUE_PRICE)
    button(c, M + 6 * mm, y - 30 * mm, W - 2 * M - 12 * mm, 9 * mm,
           "Découvrir le Catalogue Premium sur wooplans.com", CATALOGUE_URL, size=11)
    footer(c, n)


def page_whatsapp(c, n):
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    y = H - 50 * mm
    c.setFont("Semi", 10)
    c.setFillColor(HIGHLIGHT)
    c.drawString(M, y, "VOTRE PROJET")
    y -= 14 * mm
    for line in ["Vous avez déjà un terrain", "et vous voulez démarrer", "dans les prochains mois ?"]:
        c.setFont("Head", 24)
        c.setFillColor(white)
        c.drawString(M, y, line)
        y -= 11 * mm
    y -= 4 * mm
    y = para(c, "Écrivez-moi sur WhatsApp. Dites-moi la taille de votre terrain, le nombre de chambres que vous voulez et "
                "votre budget : je vous oriente vers les modèles qui vous correspondent, et vers les plans complets quand "
                "vous êtes prêt à construire.", M, y, W - 2 * M - 10 * mm, size=12.5, color=HexColor("#E6F0EF"), leading=18)
    y -= 10 * mm
    button(c, M, y - 12 * mm, 110 * mm, 12 * mm, "Écrire à Tao sur WhatsApp", WHATSAPP_URL, size=12.5)
    y -= 30 * mm
    c.setFont("Body", 11)
    c.setFillColor(HexColor("#CFE3E2"))
    c.drawString(M, y, "Tao, fondateur de WooPlans")
    c.drawString(M, 20 * mm, SITE)


# ---------------------------------------------------------------- échantillon du Catalogue Premium
# Deux vraies pages A3 du Catalogue Premium (fournies par Tao le 17 nov. 2026), insérées en pages A4 paysage
# après la page d'introduction, sans perte de qualité (pypdf, après la génération du guide).
SAMPLE_PAGES = [HERE / "sample" / "d4-034-premium.pdf", HERE / "sample" / "v3-038-premium.pdf"]


def page_sample_intro(c, n):
    y = title_block(c, "Exemple réel du Catalogue Premium", "Voici à quoi ressemble chaque maison dans le catalogue")
    y = para(c, "Votre guide montre les maisons et leur budget. Dans le Catalogue Premium, chaque modèle a sa page "
                "complète : rendus 3D, plan de distribution coté de chaque niveau, terrain nécessaire et devis de "
                "construction poste par poste.", M, y, W - 2 * M, size=12.5) - 4 * mm
    y = para(c, "Les deux pages suivantes sont de vraies pages du catalogue : le duplex D4-034 et la villa V3-038. "
                "Tournez votre téléphone pour les voir en grand.", M, y, W - 2 * M, size=12.5) - 10 * mm
    y = bullet_list(c, [
        "Le plan coté de chaque niveau, avec la dimension de chaque pièce.",
        "Le devis estimatif clé en main, poste par poste : fondation, élévations, toiture, finitions.",
        "Le terrain nécessaire et l'emprise au sol du bâtiment.",
    ], M, y, W - 2 * M, size=12) - 8 * mm
    c.setFillColor(BG)
    c.roundRect(M, y - 42 * mm, W - 2 * M, 42 * mm, 4 * mm, stroke=0, fill=1)
    c.setFont("Head", 15)
    c.setFillColor(PRIMARY)
    c.drawString(M + 6 * mm, y - 11 * mm, f"Les {ANNOUNCED_MODELS - 2} autres modèles, avec la même page complète")
    para(c, f"Dans le Catalogue Premium : {CATALOGUE_PRICE}, paiement unique par Mobile Money ou carte, accès immédiat, "
            "nouveaux modèles inclus.", M + 6 * mm, y - 18 * mm, W - 2 * M - 12 * mm, size=10.5, color=DARK)
    button(c, M + 6 * mm, y - 37 * mm, W - 2 * M - 12 * mm, 9 * mm,
           "Voir le Catalogue Premium sur wooplans.com", CATALOGUE_URL, size=11)
    footer(c, n)


def insert_sample_pages(path: Path, after_page: int):
    """Insère les pages A3 du catalogue, réduites en A4 paysage, après la page `after_page` (numérotée à partir de 1)."""
    from pypdf import PdfReader, PdfWriter

    guide = PdfReader(str(path))
    out = PdfWriter()
    for i, page in enumerate(guide.pages, 1):
        out.add_page(page)
        if i == after_page:
            for sample in SAMPLE_PAGES:
                p = out.add_page(PdfReader(str(sample)).pages[0])  # rattachée au writer avant la mise à l'échelle (pypdf 7)
                p.scale_by(min(841.89 / float(p.mediabox.width), 595.28 / float(p.mediabox.height)))
    out.compress_identical_objects()
    with open(path, "wb") as f:
        out.write(f)


# ---------------------------------------------------------------- assemblage
def build(out: Path):
    register_fonts()
    plans = json.loads((CACHE / "plans.json").read_text())
    plans.sort(key=lambda p: (mid(p), p["code"]))
    c = canvas.Canvas(str(out), pagesize=A4)
    c.setTitle("Le Guide WooPlans des maisons")
    c.setAuthor("WooPlans")
    c.setSubject(f"{ANNOUNCED_MODELS} villas et duplex avec leur budget de construction")

    n = 1
    page_cover(c, plans)
    c.showPage(); n += 1
    page_how_to(c, plans, n)
    c.showPage(); n += 1
    page_decisions(c, n)
    c.showPage(); n += 1
    page_sample_intro(c, n)
    sample_after = n
    c.showPage(); n += 1 + len(SAMPLE_PAGES)
    for label, lo, hi in BRACKETS:
        group = [p for p in plans if lo <= mid(p) < hi]
        if not group:
            continue
        page_bracket_divider(c, label, group, n)
        c.showPage(); n += 1
        for i in range(0, len(group), 2):
            model_card(c, group[i], H - 12 * mm)
            if i + 1 < len(group):
                c.setStrokeColor(LINE)
                c.line(M, H / 2 + 2 * mm, W - M, H / 2 + 2 * mm)
                model_card(c, group[i + 1], H / 2 - 3 * mm)
            footer(c, n)
            c.showPage(); n += 1
    n = page_land_table(c, plans, n)
    c.showPage(); n += 1
    page_favorites(c, n)
    c.showPage(); n += 1
    page_premium(c, n)
    c.showPage(); n += 1
    page_whatsapp(c, n)
    c.showPage()
    c.save()
    insert_sample_pages(out, sample_after)
    print(f"OK : {out} ({n} pages, {len(plans)} modèles, {out.stat().st_size / 1e6:.1f} Mo)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "out" / "guide-wooplans-des-maisons.pdf"))
    a = ap.parse_args()
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    build(Path(a.out))
