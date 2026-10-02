"""Prepare les images du musee pour le jeu (assets-source/musee -> public/assets/rooms/musee).

- Les 4 parties du fond (1536 x 704) sont copiees telles quelles : une texture de 6144 px de large
  depasserait la limite de certains telephones.
- Chaque tableau est fourni en grand (examen plein ecran, transparence conservee) et en
  miniature (affichage dans la galerie), a 3 pixels par pixel d'affichage de la galerie.

Usage : pip install pillow && python tools/preparer-musee.py
"""
import json
import shutil
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/musee"
OUT = RACINE / "public/assets/rooms/musee"


def main():
    (OUT / "tableaux/mini").mkdir(parents=True, exist_ok=True)
    for i in range(1, 5):
        shutil.copy(SRC / f"partie-{i}.png", OUT / f"partie-{i}.png")
    positions = json.loads((SRC / "positions-tableaux.json").read_text())
    for p in positions:
        nom = p["id"]
        img = Image.open(SRC / "tableaux" / f"{nom}.png").convert("RGBA")
        img.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(OUT / "tableaux" / f"{nom}.png", optimize=True)
        largeur = round(p["render_rect"][2] * 3)
        mini = img.resize((largeur, round(img.height * largeur / img.width)), Image.LANCZOS)
        # Palette de 256 couleurs (pixel art) : fichiers beaucoup plus legers.
        mini.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(OUT / "tableaux/mini" / f"{nom}.png", optimize=True)
        print(nom, img.size, "->", mini.size)


if __name__ == "__main__":
    main()
