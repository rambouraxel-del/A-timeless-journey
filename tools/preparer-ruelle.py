"""Copie les 12 images de la ruelle (assets-source/ruelle/assets/) vers public/assets/rooms/ruelle/.

Les PNG sont conserves tels quels : le pack est deja decoupe (ciel, 3 sections de batiments lointains,
4 de facades, 4 de sol). Positions et facteurs de defilement : src/data/rooms/ruelle/manifest.json.

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
