"""Prepare les couches de la ruelle (assets-source/ruelle/section-0N/) vers public/assets/rooms/ruelle/.

Les PNG de 1086 x 1448 px sont conserves (canvas complet, transparence comprise), sauf deux corrections
sur les facades, pour que rien ne transparaisse quand le fond se deplace plus lentement qu'elles :
- les petits trous de transparence enfermes dans le mur sont rebouches (couleur du pixel opaque voisin) ;
- les pixels opaques isoles qui flottent dans le ciel sont supprimes.
Le fond (ciel, maisons) est produit par tools/preparer-ruelle-fond.py.

Usage : pip install pillow numpy scipy && python tools/preparer-ruelle.py
"""
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ruelle"
OUT = RACINE / "public/assets/rooms/ruelle"


SECTIONS = [f"section-0{i}" for i in range(1, 5)]
LARGEUR = 1086


def nettoyer_facades():
    pano = np.concatenate([np.array(Image.open(SRC / s / "01-facades.png").convert("RGBA")) for s in SECTIONS], axis=1)
    opaque = pano[:, :, 3] > 0
    # Trous enfermes : composantes transparentes qui ne touchent pas le bord haut (le ciel le touche).
    lab, n = ndimage.label(~opaque)
    tailles0 = ndimage.sum(~opaque, lab, range(1, n + 1))
    petits = [i + 1 for i, t in enumerate(tailles0) if t < 800]  # le ciel et le sol (grandes zones) restent transparents
    haut = set(np.unique(lab[0])) - {0}
    trous = np.isin(lab, petits) & ~np.isin(lab, list(haut))
    # Ilots opaques isoles (moins de 40 pixels), hors du bord.
    lab2, n2 = ndimage.label(opaque)
    tailles = ndimage.sum(opaque, lab2, range(1, n2 + 1))
    ilots = np.isin(lab2, [i + 1 for i, t in enumerate(tailles) if t < 40])
    # Couleur des trous : pixel opaque le plus proche.
    _, (iy, ix) = ndimage.distance_transform_edt(~opaque | trous, return_indices=True)
    plein = pano.copy()
    plein[trous] = pano[iy[trous], ix[trous]]
    plein[trous, 3] = 255
    plein[ilots] = 0
    # Restes d'immeubles lointains colles contre le mur du fond (cheminees tronquees, pans d'ardoise) : ils
    # appartiennent au fond et flotteraient devant le ciel ; on efface ce qui est a gauche de la ligne de lierre.
    yy, xx = np.mgrid[0 : pano.shape[0], 0 : pano.shape[1]]
    reste = (yy >= 225) & (yy < 420) & (xx >= 4015) & (xx < 4050 + (422 - yy) / 1.12 + 7)
    # Fragments de nuages blancs colles au haut du mur et des cheminees (restes du fond) : supprimes.
    rgb = pano[:, :, :3].astype(float) / 255
    blanc = ((rgb.min(axis=2) > 0.8) | ((rgb[:, :, 2] > rgb[:, :, 0] + 0.04) & (rgb.max(axis=2) > 0.72))) & (yy < 410) & (pano[:, :, 3] > 0)
    reste |= blanc
    # Fine bande d'ardoise posee sur le mur (debris du fond) : supprimee.
    reste |= (yy >= 395) & (yy < 421) & (xx >= 3745) & (xx < 4040)
    plein[reste] = 0
    print("facades : %d pixels de restes d'immeubles supprimes" % (reste & (pano[:, :, 3] > 0)).sum())
    print("facades : %d pixels de trou rebouches, %d pixels isoles supprimes" % (trous.sum(), ilots.sum()))
    for i, s in enumerate(SECTIONS):
        Image.fromarray(plein[:, i * LARGEUR : (i + 1) * LARGEUR], "RGBA").save(OUT / s / "01-facades.png", optimize=True)


def main():
    for dossier in sorted(SRC.glob("section-0*")):
        (OUT / dossier.name).mkdir(parents=True, exist_ok=True)
        for png in sorted(dossier.glob("*.png")):
            if png.name != "00-arriere-plan.png":  # remplace par le ciel et les maisons (preparer-ruelle-fond.py)
                shutil.copy(png, OUT / dossier.name / png.name)
    nettoyer_facades()
    print(len(list(OUT.glob("*/*.png"))), "couches")


if __name__ == "__main__":
    main()
