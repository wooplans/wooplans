#!/usr/bin/env python3
"""Récupère les modèles publiés sur wooplans.com (données publiques + rendu de couverture) pour le Guide.

Sortie : scripts/guide/cache/plans.json et scripts/guide/cache/img/<slug>.jpg
Usage : python scripts/guide/fetch_plans.py [--site https://www.wooplans.com]
Seules les données publiques du site sont utilisées (aucune distribution cotée, aucun devis par lots).
"""
import argparse, io, json, re, sys, time, urllib.request
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
FIELDS_NUM = ["bedrooms", "bathrooms", "levels", "surfaceTotal", "footprint", "landArea", "budgetMin", "budgetMax"]


def get(url: str) -> bytes:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "wooplans-guide-builder"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(url)


def parse_plan(html: str, slug: str) -> dict:
    # Les données de la fiche sont dans la charge utile React (échappée) de la page.
    text = html.replace('\\"', '"')
    m = re.search(r'"slug":"%s"' % re.escape(slug), text)
    if not m:
        raise ValueError(f"données introuvables pour {slug}")
    # Fenêtre autour de l'objet du modèle.
    start = text.rfind("{", 0, m.start())
    window = text[max(0, m.start() - 4000): m.start() + 4000]
    plan = {"slug": slug}
    for key in ["code", "name", "category"]:
        mm = re.search(r'"%s":"([^"]+)"' % key, window)
        plan[key] = mm.group(1) if mm else None
    for key in FIELDS_NUM:
        mm = re.search(r'"%s":(null|[0-9.]+)' % key, window)
        plan[key] = None if not mm or mm.group(1) == "null" else float(mm.group(1))
    imgs = re.search(r'"images":\[("[^\]]*")\]', text)
    cover = re.search(r'"coverImage":"([^"]+)"', window)
    plan["cover"] = cover.group(1) if cover else (json.loads("[" + imgs.group(1) + "]")[0] if imgs else None)
    return plan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="https://www.wooplans.com")
    ap.add_argument("--width", type=int, default=1100)
    args = ap.parse_args()
    (CACHE / "img").mkdir(parents=True, exist_ok=True)

    # Données publiques des modèles publiés (/api/guide/modeles) : les fiches ne portent plus toutes leurs données
    # dans la page depuis la nouvelle présentation (16 nov. 2026).
    # Le site et ce générateur partent au même moment après un merge : on attend que l'adresse soit en ligne (45 min max).
    for attempt in range(90):
        try:
            rows = json.loads(get(args.site + "/api/guide/modeles").decode("utf-8"))
            break
        except Exception as e:  # noqa: BLE001
            if attempt == 89:
                raise
            print(f"  /api/guide/modeles pas encore en ligne ({e}), nouvel essai dans 30 s", flush=True)
            time.sleep(30)
    print(f"{len(rows)} modèles publiés")
    plans = []
    for i, row in enumerate(sorted(rows, key=lambda r: r["slug"]), 1):
        slug = row["slug"]
        plan = {k: row.get(k) for k in ["slug", "code", "name", "category", "cover"]}
        for key in FIELDS_NUM:
            plan[key] = None if row.get(key) is None else float(row[key])
        if not plan.get("cover") or plan.get("budgetMin") is None or plan.get("budgetMax") is None:
            print(f"  ! {slug} : rendu ou budget manquant, ignoré", file=sys.stderr)
            continue
        img_path = CACHE / "img" / f"{slug}.jpg"
        if not img_path.exists():
            raw = get(f"{args.site}{plan['cover']}?w={args.width}")
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            if im.width > args.width:
                im = im.resize((args.width, round(im.height * args.width / im.width)), Image.LANCZOS)
            im.save(img_path, "JPEG", quality=72, optimize=True, progressive=True)
        plan["image"] = str(img_path.relative_to(HERE))
        plans.append(plan)
        print(f"  {i:3d}/{len(rows)} {plan['code']}")
    (CACHE / "plans.json").write_text(json.dumps(plans, ensure_ascii=False, indent=1))
    print(f"OK : {len(plans)} modèles dans {CACHE / 'plans.json'}")


if __name__ == "__main__":
    main()
