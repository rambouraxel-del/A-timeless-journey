"""Prepare la porte (assets-source/portes -> public/assets/rooms/portes).

Les images sources (1086 x 1448) sont reduites de moitie (543 x 724) : assez pour l'affichage le plus grand.

Deux etats (fermee, ouverte) en deux orientations : d'origine (musee) et en miroir horizontal
(vaisseau, ouverture vers la droite). Le miroir est fait ici pour que le contour d'interaction
et l'image restent identiques.

La sortie de secours (assets-source/portes/sortie_secours.png, 1024 x 1536) est reduite a 512 x 768 ; une seule
orientation et un seul etat (le panneau fleche pointe vers la droite : pas de miroir).

Porte « impossible » de la ruelle : porte_ouverte_vaisseau.png est la porte ouverte (orientation d'origine) dont la
lumiere du passage est remplacee par une vue de l'interieur du vaisseau (decoupee dans
assets-source/vaisseau/apercu_scene_complete.png, autour du reacteur). Composition de deux images du projet, aucun
pixel dessine ; un liseré de lumiere est garde au bord du passage.

Usage : pip install pillow && python tools/preparer-portes.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

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
    passage_vers_vaisseau()
    exit_img = Image.open(SRC / "sortie_secours.png").convert("RGBA").resize((512, 768), Image.LANCZOS)
    exit_img.save(OUT / "sortie_secours.png", optimize=True)
    print("sortie_secours", exit_img.size, exit_img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox())


def passage_vers_vaisseau():
    porte = np.array(Image.open(SRC / "porte_ouverte.png").convert("RGBA").resize((543, 724), Image.LANCZOS)).astype(float)
    r, g, a = porte[..., 0], porte[..., 1], porte[..., 3]
    # Lumiere du passage : la plus grande zone jaune tres claire, trous combles.
    lumiere = (r > 215) & (g > 190) & (a > 200)
    lab, n = ndimage.label(lumiere)
    tailles = ndimage.sum(lumiere, lab, range(1, n + 1))
    masque = ndimage.binary_fill_holes(lab == (int(np.argmax(tailles)) + 1))
    ys, xs = np.where(masque)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    # Vue du vaisseau : bande verticale centree sur le reacteur, aux proportions du passage.
    vue = Image.open(RACINE / "assets-source/vaisseau/apercu_scene_complete.png").convert("RGBA")
    hauteur = 1000
    largeur = round(hauteur * (x1 - x0) / (y1 - y0))
    cx = 1760
    vue = vue.crop((cx - largeur // 2, 40, cx - largeur // 2 + largeur, 40 + hauteur)).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    fond = np.zeros_like(porte)
    fond[y0:y1, x0:x1] = np.array(vue).astype(float)
    # Coeur du passage remplace ; bord de 3 px melange a la lumiere d'origine (liseré lumineux).
    coeur = ndimage.binary_erosion(masque, iterations=3)
    bord = masque & ~coeur
    sortie = porte.copy()
    sortie[coeur, :3] = fond[coeur, :3]
    sortie[bord, :3] = 0.5 * porte[bord, :3] + 0.5 * fond[bord, :3]
    Image.fromarray(sortie.round().astype(np.uint8), "RGBA").save(OUT / "porte_ouverte_vaisseau.png", optimize=True)
    print("porte_ouverte_vaisseau", (x0, y0, x1, y1))


if __name__ == "__main__":
    main()
