"""Prepare les personnages non joueurs (assets-source/pnj -> public/assets/characters/pnj).

19 sprites PNG de 128 x 128 px, tournes vers la droite (le jeu les retourne pour regarder a gauche).
Les images sont copiees telles quelles ; on mesure seulement la partie visible (pieds, hauteur, largeur)
pour les ancrer au sol et regler leur echelle. Ecrit src/data/rooms/musee/pnj-sprites.json.

Usage : pip install pillow && python tools/preparer-pnj.py
"""
import json
import shutil
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/pnj"
OUT = RACINE / "public/assets/characters/pnj"
JSON = RACINE / "src/data/rooms/musee/pnj-sprites.json"


def main():
    infos = {}
    for fichier in sorted(SRC.glob("*/*.png")):
        img = Image.open(fichier).convert("RGBA")
        x0, y0, x1, y1 = img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        cle = f"{fichier.parent.name}/{fichier.stem}"
        (OUT / fichier.parent.name).mkdir(parents=True, exist_ok=True)
        shutil.copy(fichier, OUT / fichier.parent.name / fichier.name)
        infos[cle] = {"file": f"{cle}.png", "size": img.width, "feetY": y1, "visibleHeight": y1 - y0, "visibleWidth": x1 - x0}
    JSON.write_text(json.dumps(infos, indent=2, ensure_ascii=False) + "\n")
    print(len(infos), "sprites")


if __name__ == "__main__":
    main()
