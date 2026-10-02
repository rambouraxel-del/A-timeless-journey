"""Copie les 16 couches de la ruelle (assets-source/ruelle/section-0N/) vers public/assets/rooms/ruelle/.

Les PNG de 1086 x 1448 px sont conserves tels quels (canvas complet, transparence comprise).

Usage : python tools/preparer-ruelle.py
"""
import shutil
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ruelle"
OUT = RACINE / "public/assets/rooms/ruelle"


def main():
    for dossier in sorted(SRC.glob("section-0*")):
        (OUT / dossier.name).mkdir(parents=True, exist_ok=True)
        for png in sorted(dossier.glob("*.png")):
            shutil.copy(png, OUT / dossier.name / png.name)
    print(len(list(OUT.glob("*/*.png"))), "couches")


if __name__ == "__main__":
    main()
