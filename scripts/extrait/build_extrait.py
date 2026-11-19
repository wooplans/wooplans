#!/usr/bin/env python3
"""Fabrique le PDF « Extrait du Catalogue Premium » (offre d'entrée à 1 900 FCFA, test du 17 nov. 2026).

Contenu : couverture, mode d'emploi, les 5 vraies pages A3 du Catalogue Premium (scripts/extrait/pages/, extraites
des PDF A3 de Tao du 12 nov. 2026, sans aucune retouche des chiffres), la liste verrouillée des autres modèles
(scripts/extrait/models.json, avec la façade de chacun : scripts/extrait/thumbs/) puis l'appel vers le Catalogue Premium.
Usage : python scripts/extrait/build_extrait.py [--out extrait-catalogue-premium.pdf]
"""
from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "guide"))
from build_guide import register_fonts  # noqa: E402  (Montserrat du site)

PRIMARY = HexColor("#0F5B59")
ACCENT = HexColor("#F08A2E")
DARK = HexColor("#1E2933")
MUTED = HexColor("#6B7280")
LINE = HexColor("#E3E7EB")
SOFT = HexColor("#F5F7F9")

W, H = 1191.12, 841.92  # A3 paysage, comme les pages du catalogue
M = 56

CONFIG = json.loads((ROOT / "src" / "config" / "extrait.json").read_text())
CATALOGUE = json.loads((ROOT / "src" / "config" / "catalogue.json").read_text())
ORDER = [s.split("-", 1)[1].upper() for s in CONFIG["slugs"]]  # villa-v3-001 -> V3-001
UTM = "utm_source=extrait&utm_medium=pdf&utm_campaign=extrait_catalogue"
CATALOGUE_URL = f"https://wooplans.com/extrait-catalogue-premium/catalogue?{UTM}"


def fcfa(v: int) -> str:
    return f"{v:,}".replace(",", " ") + " FCFA"


def page(draw) -> PdfReader:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    draw(c)
    c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def cover(c):
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    logo = ROOT / "public" / "assets" / "wooplans-logo-white.png"
    if logo.exists():
        c.drawImage(str(logo), M, H - M - 60, width=200, height=60, preserveAspectRatio=True, anchor="sw", mask="auto")
    c.setFillColor(white)
    c.setFont("Head", 64)
    c.drawString(M, H / 2 + 30, "Extrait du Catalogue")
    c.setFillColor(ACCENT)
    c.drawString(M + c.stringWidth("Extrait du Catalogue ", "Head", 64), H / 2 + 30, "Premium")
    c.setFillColor(white)
    c.setFont("Semi", 24)
    c.drawString(M, H / 2 - 20, f"{len(ORDER)} maisons avec leur plan de distribution et leur devis poste par poste")
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.5)
    c.line(M, 130, W - M, 130)
    c.setFont("Head7", 15)
    c.drawString(M, 100, " · ".join(ORDER))
    c.drawString(M, 76, "wooplans.com/catalogue-premium")


def intro(c):
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(PRIMARY)
    c.setFont("Head", 40)
    c.drawString(M, H - M - 40, "Vos 5 maisons")
    c.setFillColor(DARK)
    c.setFont("Semi", 17)
    c.drawString(M, H - M - 78, "Les pages ci-après sont les vraies fiches du Catalogue Premium, au même format A3.")
    y = H - M - 150
    for i, code in enumerate(ORDER):
        c.setFillColor(SOFT)
        c.roundRect(M, y - 18, 520, 52, 10, fill=1, stroke=0)
        c.setFillColor(PRIMARY)
        c.setFont("Head", 22)
        c.drawString(M + 22, y, code)
        c.setFillColor(MUTED)
        c.setFont("Semi", 15)
        c.drawRightString(M + 498, y + 2, f"page {i + 3}")
        y -= 70
    x = W / 2 + 40
    c.setFillColor(PRIMARY)
    c.setFont("Head", 24)
    c.drawString(x, H - M - 150, "Sur chaque fiche")
    items = [
        "Le rendu 3D : façade, extérieur, vue d'ensemble",
        "Le plan de distribution coté",
        "Terrain nécessaire et emprise au sol",
        "Le devis estimatif clé en main, poste par poste",
        "La composition : pièces et surfaces",
    ]
    c.setFont("Semi", 17)
    yy = H - M - 200
    for t in items:
        c.setFillColor(ACCENT)
        c.circle(x + 7, yy + 6, 5, fill=1, stroke=0)
        c.setFillColor(DARK)
        c.drawString(x + 24, yy, t)
        yy -= 40
    c.setFillColor(MUTED)
    c.setFont("Semi", 13)
    c.drawString(x, yy - 20, "Devis : coûts indicatifs, ils dépendent du type de sol,")
    c.drawString(x, yy - 38, "des fournitures et des matériaux.")


def stamp(c, n: int, total: int):
    """Remplace « page 30 / 60 » du catalogue par la pagination de l'extrait (bas de page, au centre)."""
    c.setFillColor(white)
    c.rect(W * 0.36, 0, W * 0.30, 40, fill=1, stroke=0)
    c.setFillColor(PRIMARY)
    c.setFont("Head7", 11)
    c.drawCentredString(W * 0.51, 21, f"Extrait du Catalogue Premium · page {n} / {total}")


def others_models():
    return [m for m in json.loads((HERE / "models.json").read_text()) if m["code"] not in ORDER]


def others(c, category: str, first: bool):
    """Les autres modèles du catalogue, en image (façade de leur fiche), verrouillés : le meilleur teaser du catalogue."""
    allm = others_models()
    models = [m for m in allm if m["category"] == category]
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(PRIMARY)
    c.setFont("Head", 34)
    title = f"Et {len(allm)} autres maisons dans le Catalogue Premium" if first else "Les duplex du Catalogue Premium"
    c.drawString(M, H - M - 34, title)
    c.setFillColor(DARK)
    c.setFont("Semi", 16)
    noun = "villas" if category == "villa" else "duplex"
    c.drawString(M, H - M - 66, f"{len(models)} {noun}, chacune avec la même fiche : rendu 3D, plan de distribution coté et devis poste par poste.")
    cols = 9 if len(models) > 40 else 8
    gap = 10
    cw = (W - 2 * M - (cols - 1) * gap) / cols
    ih = cw * 192 / 408
    ch = ih + 36
    top = H - M - 96
    for i, m in enumerate(models):
        r, k = divmod(i, cols)
        x = M + k * (cw + gap)
        y = top - (r + 1) * (ch + gap)
        c.setFillColor(SOFT)
        c.roundRect(x, y, cw, ch, 6, fill=1, stroke=0)
        thumb = HERE / "thumbs" / f"{m['code'].lower()}.jpg"
        if thumb.exists():
            c.drawImage(str(thumb), x, y + 36, width=cw, height=ih)
        c.setFillColor(PRIMARY)
        c.setFont("Head", 12)
        c.drawString(x + 7, y + 20, m["code"])
        c.setFillColor(MUTED)
        c.setFont("Semi", 9.5)
        c.drawString(x + 7, y + 7, f"{m['bedrooms']} chambres · {m['surface']} m²")
        # cadenas sur l'image
        lx, ly = x + cw - 22, y + ch - 22
        c.setFillColor(white)
        c.circle(lx + 7, ly + 7, 11, fill=1, stroke=0)
        c.setFillColor(ACCENT)
        c.roundRect(lx + 1.5, ly + 1, 11, 9, 1.5, fill=1, stroke=0)
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.6)
        c.arc(lx + 3.5, ly + 5, lx + 10.5, ly + 15, 0, 180)


def cta(c):
    price = CATALOGUE["price"]
    before = CATALOGUE.get("priceBefore")
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Head", 46)
    c.drawCentredString(W / 2, H - 230, "Toutes les maisons, au même format")
    c.setFont("Semi", 20)
    c.drawCentredString(W / 2, H - 275, "Le Catalogue Premium : plan de distribution et devis poste par poste de chaque modèle,")
    c.drawCentredString(W / 2, H - 302, "fiches PDF à montrer à votre maçon, nouveaux modèles inclus.")
    y = H / 2 - 30
    if isinstance(before, int) and before > price:
        c.setFillColor(HexColor("#BFD6D5"))
        c.setFont("Head7", 26)
        s = fcfa(before)
        c.drawCentredString(W / 2, y + 62, s)
        sw = c.stringWidth(s, "Head7", 26)
        c.setStrokeColor(HexColor("#BFD6D5"))
        c.setLineWidth(2)
        c.line(W / 2 - sw / 2, y + 71, W / 2 + sw / 2, y + 71)
    c.setFillColor(white)
    c.setFont("Head", 60)
    c.drawCentredString(W / 2, y, fcfa(price))
    bw, bh = 520, 72
    bx, by = W / 2 - bw / 2, y - 130
    c.setFillColor(ACCENT)
    c.roundRect(bx, by, bw, bh, 36, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Head", 24)
    c.drawCentredString(W / 2, by + 27, "Voir le Catalogue Premium →")
    c.linkURL(CATALOGUE_URL, (bx, by, bx + bw, by + bh), relative=0)
    c.setFont("Semi", 16)
    c.drawCentredString(W / 2, by - 40, "wooplans.com/catalogue-premium")
    c.linkURL(CATALOGUE_URL, (W / 2 - 160, by - 50, W / 2 + 160, by - 26), relative=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "out" / "extrait-catalogue-premium.pdf"))
    args = ap.parse_args()
    register_fonts()
    total = len(ORDER) + 5
    out = PdfWriter()
    out.add_page(page(cover).pages[0])
    out.add_page(page(intro).pages[0])
    for i, code in enumerate(ORDER):
        src = PdfReader(str(HERE / "pages" / f"{code.lower()}.pdf")).pages[0]
        p = out.add_page(src)
        p.merge_page(page(lambda c, n=i + 3: stamp(c, n, total)).pages[0])
    out.add_page(page(lambda c: others(c, "villa", True)).pages[0])
    out.add_page(page(lambda c: others(c, "duplex", False)).pages[0])
    out.add_page(page(cta).pages[0])
    out.add_metadata({"/Title": "Extrait du Catalogue Premium · WooPlans", "/Author": "WooPlans"})
    out.compress_identical_objects()
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "wb") as f:
        out.write(f)
    print(args.out, Path(args.out).stat().st_size // 1024, "Ko")


if __name__ == "__main__":
    main()
