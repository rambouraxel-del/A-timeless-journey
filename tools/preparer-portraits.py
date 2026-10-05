"""Prepare les portraits de dialogue et les images d'objets.

  assets-source/portraits/*.png -> public/assets/portraits/*.png
  assets-source/objets/*.png    -> public/assets/objets/*.png

Les sources font 1254 x 1254 px (pixel art, fond transparent). Elles sont reduites a 256 x 256 px (filtre Lanczos
sur couleurs premultipliees, bruit d'alpha nettoye), taille proche de leur affichage sur un telephone ; le jeu les
affiche avec un filtrage lisse.

Ajouter un portrait ou un objet : deposer le PNG dans le dossier source, relancer ce script, puis declarer l'image
dans src/config/Portraits.ts ou src/config/Items.ts.

Usage : pip install pillow numpy && python tools/preparer-portraits.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
DOSSIERS = [
    (RACINE / "assets-source/portraits", RACINE / "public/assets/portraits"),
    (RACINE / "assets-source/objets", RACINE / "public/assets/objets"),
]
TAILLE = 256


def main():
    for src, out in DOSSIERS:
        out.mkdir(parents=True, exist_ok=True)
        for fichier in sorted(src.glob("*.png")):
            img = Image.open(fichier).convert("RGBA")
            petit = img.convert("RGBa").resize((TAILLE, TAILLE), Image.LANCZOS).convert("RGBA")
            a = np.array(petit)
            al = a[..., 3]
            al[al < 16] = 0
            al[al > 240] = 255
            Image.fromarray(a, "RGBA").save(out / fichier.name, optimize=True)
            print(fichier.name, "->", out.relative_to(RACINE), petit.size)


if __name__ == "__main__":
    main()
