#!/usr/bin/env python3
"""
Filigrane des rendus publics (version du site fabriquée à partir de l'original, voir src/lib/site-render.ts).

Produit deux calques PNG transparents, aux couleurs de la charte (vert #0F5B59, or #E7C36C,
police Montserrat du site) :
  public/assets/filigrane/pastille.png  pastille « Visitez wooplans.com » posée en bas à gauche
  public/assets/filigrane/motif.png     motif « wooplans.com » en diagonale, répété sur toute l'image

Usage : pip install pillow fonttools brotli && python3 scripts/build-watermark.py
"""
import io
import math
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/filigrane"
PRIMARY = (15, 91, 89)
HIGHLIGHT = (231, 195, 108)
WHITE = (255, 255, 255)


def font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    ttf = TTFont(ROOT / f"src/app/fonts/montserrat-latin-{weight}-normal.woff2")
    ttf.flavor = None
    buf = io.BytesIO()
    ttf.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def house(size: int, width: int) -> Image.Image:
    """Pictogramme maison du logo (toit, murs, flèche), redessiné en vectoriel."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size
    w = width
    d.line([(s * 0.06, s * 0.50), (s * 0.50, s * 0.10), (s * 0.94, s * 0.50)], fill=WHITE, width=w, joint="curve")
    d.line([(s * 0.20, s * 0.42), (s * 0.20, s * 0.90), (s * 0.80, s * 0.90), (s * 0.80, s * 0.42)], fill=WHITE, width=w, joint="curve")
    d.line([(s * 0.50, s * 0.88), (s * 0.50, s * 0.42)], fill=WHITE, width=w)
    d.line([(s * 0.36, s * 0.56), (s * 0.50, s * 0.42), (s * 0.64, s * 0.56)], fill=WHITE, width=w, joint="curve")
    return im


def pastille() -> Image.Image:
    """Dessinée en 2× (1 000 px de large) : réduite à la taille voulue au moment de l'incrustation."""
    text = "Visitez wooplans.com"
    f = font(700, 64)
    tw = int(f.getlength(text))
    h = 124
    icon = 76
    pad = 34
    w = pad + icon + 22 + tw + pad + 8
    shadow = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([20, 26, w + 20, h + 26], radius=h // 2, fill=(0, 0, 0, 90))
    im = shadow.filter(ImageFilter.GaussianBlur(9))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([20, 20, w + 20, h + 20], radius=h // 2, fill=PRIMARY + (238,), outline=HIGHLIGHT + (255,), width=5)
    im.alpha_composite(house(icon, 8), (20 + pad, 20 + (h - icon) // 2 - 2))
    d.text((20 + pad + icon + 22, 20 + h // 2), text, font=f, fill=WHITE, anchor="lm")
    return im


def motif() -> Image.Image:
    """Tuile de 640 × 400 : « wooplans.com » en quinconce à −25°, blanches, cernées de sombre, très discrètes."""
    tw, th = 640, 400
    f = font(700, 30)
    text = "wooplans.com"
    stamp = Image.new("RGBA", (int(f.getlength(text)) + 12, 52), (0, 0, 0, 0))
    ImageDraw.Draw(stamp).text((6, 26), text, font=f, anchor="lm", fill=(255, 255, 255, 74), stroke_width=2, stroke_fill=(0, 0, 0, 40))
    stamp = stamp.rotate(25, resample=Image.BICUBIC, expand=True)
    tile = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    # Chaque tampon est aussi posé décalé d'une tuile : la tuile se raccorde parfaitement une fois répétée.
    for cx, cy in [(160, 90), (480, 90), (0, 290), (320, 290)]:
        for dx in (-tw, 0, tw):
            for dy in (-th, 0, th):
                tile.paste(stamp, (cx + dx - stamp.width // 2, cy + dy - stamp.height // 2), stamp)
    return tile


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    p = pastille()
    p.save(OUT / "pastille.png", optimize=True)
    m = motif()
    m.save(OUT / "motif.png", optimize=True)
    print("pastille", p.size, "motif", m.size)
