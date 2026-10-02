"""Prepare la porte (assets-source/portes -> public/assets/rooms/portes).

Deux etats (fermee, ouverte) en deux orientations : d'origine (musee) et en miroir horizontal
(vaisseau, ouverture vers la droite). Le miroir est fait ici pour que le contour d'interaction
et l'image restent identiques.

Usage : pip install pillow && python tools/preparer-portes.py
"""
from pathlib import Path

from PIL import Image, ImageOps

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/portes"
OUT = RACINE / "public/assets/rooms/portes"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for nom in ("porte_fermee", "porte_ouverte"):
        img = Image.open(SRC / f"{nom}.png").convert("RGBA")
        img.save(OUT / f"{nom}.png", optimize=True)
        ImageOps.mirror(img).save(OUT / f"{nom}_miroir.png", optimize=True)
        print(nom, img.size)


if __name__ == "__main__":
    main()
