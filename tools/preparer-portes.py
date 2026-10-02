"""Prepare la porte (assets-source/portes -> public/assets/rooms/portes).

Les images sources (1086 x 1448) sont reduites de moitie (543 x 724) : assez pour l'affichage le plus grand.

Deux etats (fermee, ouverte) en deux orientations : d'origine (musee) et en miroir horizontal
(vaisseau, ouverture vers la droite). Le miroir est fait ici pour que le contour d'interaction
et l'image restent identiques.

La sortie de secours (assets-source/portes/sortie_secours.png, 1024 x 1536) est reduite a 512 x 768 ; une seule
orientation et un seul etat (le panneau fleche pointe vers la droite : pas de miroir).

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
        img = img.resize((543, 724), Image.LANCZOS)
        img.save(OUT / f"{nom}.png", optimize=True)
        ImageOps.mirror(img).save(OUT / f"{nom}_miroir.png", optimize=True)
        print(nom, img.size)
    exit_img = Image.open(SRC / "sortie_secours.png").convert("RGBA").resize((512, 768), Image.LANCZOS)
    exit_img.save(OUT / "sortie_secours.png", optimize=True)
    print("sortie_secours", exit_img.size, exit_img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox())


if __name__ == "__main__":
    main()
