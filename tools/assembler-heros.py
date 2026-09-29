"""Assemble la planche du heros a partir des animations fournies (assets-source/characters/hero/).

Sources : marche_droite.gif, marche_gauche.gif (8 images chacune, 152 x 152 px) et
repos_droite.png (128 x 128 px, pose de repos, la version gauche est son miroir).
Aucun pixel n'est dessine : les images sont seulement recadrees dans des cases communes
de 152 x 152 px, pieds sur la meme ligne (y = 129) et personnage centre (x = 76).

Planche (8 colonnes) : ligne 0 marche gauche, ligne 1 marche droite, ligne 2 repos gauche,
ligne 3 repos droite (une seule image chacune).

Usage : pip install pillow && python tools/assembler-heros.py
"""
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/characters/hero"
SORTIE = RACINE / "public/assets/characters/hero/hero.png"

CASE = 152
COLONNES = 8
PIEDS_Y = 129
CENTRE_X = 76


def images_gif(nom):
    with Image.open(SRC / nom) as gif:
        return [f.convert("RGBA") for f in ImageSequence.Iterator(gif)]


def repos_droite():
    """Pose de repos recentree dans une case de 152 px, pieds sur la ligne de marche."""
    img = Image.open(SRC / "repos_droite.png").convert("RGBA")
    # Le PNG contient un fin bruit presque invisible (alpha < 24) : on le supprime.
    img.putalpha(img.getchannel("A").point(lambda v: 0 if v < 24 else v))
    # Ignore les pixels quasi transparents (bruit) pour mesurer le personnage.
    solide = img.getchannel("A").point(lambda v: 255 if v > 128 else 0)
    x0, y0, x1, y1 = solide.getbbox()
    case = Image.new("RGBA", (CASE, CASE))
    case.alpha_composite(img, (CENTRE_X - (x0 + x1) // 2, PIEDS_Y - y1))
    return case


def main():
    lignes = [
        images_gif("marche_gauche.gif"),
        images_gif("marche_droite.gif"),
    ]
    repos = repos_droite()
    lignes.append([ImageOps.mirror(repos)])
    lignes.append([repos])

    planche = Image.new("RGBA", (COLONNES * CASE, len(lignes) * CASE))
    for ligne, images in enumerate(lignes):
        for col, img in enumerate(images):
            planche.alpha_composite(img, (col * CASE, ligne * CASE))
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    planche.save(SORTIE, optimize=True)
    print("Planche ecrite :", SORTIE, planche.size)


if __name__ == "__main__":
    main()
