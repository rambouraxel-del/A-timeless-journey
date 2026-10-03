"""Copie les images de la ruelle (assets-source/ruelle/assets/) vers public/assets/rooms/ruelle/.

- panorama.png : facade + sol, un seul PNG transparent de 2172 x 724 px (cour finie, jamais repetee) ;
- batiments-01 a 03 et ciel.png : plans de fond de l'ancien pack, gardes tels quels.
Les PNG sont conserves tels quels. Positions, echelles et parallaxes : src/data/rooms/ruelle/manifest.json.

Usage : python tools/preparer-ruelle.py
"""
import shutil
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ruelle/assets"
OUT = RACINE / "public/assets/rooms/ruelle"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for png in sorted(SRC.glob("*.png")):
        shutil.copy(png, OUT / png.name)
    print(len(list(OUT.glob("*.png"))), "images")


if __name__ == "__main__":
    main()
