"""Prepare l'homme mysterieux (assets-source/gardien -> public/assets/characters/gardien).

Deux sprites de 1254 x 1254 px (debout, blesse au sol), tournes vers la droite pour « debout ». Ils sont reduits
du meme facteur (1/4, filtre Lanczos sur couleurs premultipliees) pour garder la meme taille de pixel, a une
taille proche de leur affichage a l'ecran (le heros fait ~290 pixels d'ecran sur un telephone). Le fin bruit
d'alpha est nettoye (alpha < 16 -> 0, alpha > 240 -> 255). Les proportions et la transparence sont conservees.

Usage : pip install pillow numpy && python tools/preparer-gardien.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/gardien"
OUT = RACINE / "public/assets/characters/gardien"
FACTEUR = 4


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for nom in ("debout", "blesse"):
        img = Image.open(SRC / f"{nom}.png").convert("RGBA")
        petit = img.convert("RGBa").resize((img.width // FACTEUR, img.height // FACTEUR), Image.LANCZOS).convert("RGBA")
        a = np.array(petit)
        al = a[..., 3]
        al[al < 16] = 0
        al[al > 240] = 255
        Image.fromarray(a, "RGBA").save(OUT / f"{nom}.png", optimize=True)
        ys, xs = np.where(al > 40)
        print(nom, petit.size, "partie visible", (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


if __name__ == "__main__":
    main()
