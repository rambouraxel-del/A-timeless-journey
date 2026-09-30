"""Prepare les images du menu principal (assets-source/menu/ -> public/assets/menu/).

- fond.png : fond commun du chargement et du menu (JPEG, aucune transparence).
- titre et boutons : recadres sur leur contenu visible (halo compris), reduits a une largeur
  adaptee a l'affichage sur telephone (le jeu les affiche a ~80 % de la largeur de l'ecran).
Aucun pixel n'est redessine.

Usage : pip install pillow && python tools/preparer-menu.py
"""
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/menu"
OUT = RACINE / "public/assets/menu"

ELEMENTS = {  # nom de sortie : (fichier source, largeur finale en pixels)
    "titre": ("titre.png", 1100),
    "btn_nouvelle_partie": ("bouton_nouvelle_partie.png", 1000),
    "btn_continuer": ("bouton_continuer.png", 1000),
    "btn_parametres": ("bouton_parametres.png", 1000),
}


def nettoyer(img):
    """Efface la couleur des pixels quasi invisibles (evite les franges au redimensionnement)."""
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            if px[x, y][3] < 8:
                px[x, y] = (0, 0, 0, 0)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    Image.open(SRC / "fond.png").convert("RGB").save(OUT / "fond.jpg", quality=90, optimize=True)
    print("fond.jpg", Image.open(OUT / "fond.jpg").size)
    for nom, (fichier, largeur) in ELEMENTS.items():
        img = nettoyer(Image.open(SRC / fichier).convert("RGBA"))
        boite = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        img = img.crop(boite)
        hauteur = round(img.height * largeur / img.width)
        img = img.convert("RGBa").resize((largeur, hauteur), Image.LANCZOS).convert("RGBA")
        img.save(OUT / f"{nom}.png", optimize=True)
        print(nom, img.size)


if __name__ == "__main__":
    main()
