"""Assemble le personnage temporaire a partir des calques du projet LPC.

Aucun pixel n'est dessine ici : le script telecharge des calques libres
(Liberated Pixel Cup) et les superpose pour former une seule planche.

Usage : pip install pillow && python tools/assembler-heros-lpc.py
"""
import io
import urllib.request
from pathlib import Path

from PIL import Image

DEPOT = "https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/"
SORTIE = Path(__file__).resolve().parent.parent / "public/assets/characters/hero_temp/hero_lpc.png"

# Du plus au fond au plus en avant.
CALQUES = [
    "body/bodies/male",
    "feet/shoes/basic/male",
    "legs/pants/male",
    "torso/clothes/longsleeve/longsleeve/male",
    "head/heads/human/male",
    "hair/plain/adult",
]

T = 64
COLONNES = 9
# (fichier LPC, ligne source) -> ligne de la planche finale.
# Dans les planches LPC, les lignes sont : 0 dos, 1 gauche, 2 face, 3 droite.
LIGNES = [
    ("walk", 1),   # 0 : marche vers la gauche (9 images)
    ("walk", 3),   # 1 : marche vers la droite (9 images)
    ("idle", 1),   # 2 : repos gauche (2 images)
    ("idle", 3),   # 3 : repos droite (2 images)
    ("climb", 0),  # 4 : escalade, vue de dos (6 images)
]


def charger(chemin):
    with urllib.request.urlopen(DEPOT + chemin) as rep:
        return Image.open(io.BytesIO(rep.read())).convert("RGBA")


def main():
    planche = Image.new("RGBA", (COLONNES * T, len(LIGNES) * T))
    cache = {}
    for calque in CALQUES:
        for ligne_dest, (anim, ligne_src) in enumerate(LIGNES):
            cle = (calque, anim)
            if cle not in cache:
                cache[cle] = charger(f"{calque}/{anim}.png")
            src = cache[cle]
            bande = src.crop((0, ligne_src * T, min(src.width, COLONNES * T), (ligne_src + 1) * T))
            couche = Image.new("RGBA", planche.size)
            couche.paste(bande, (0, ligne_dest * T))
            planche = Image.alpha_composite(planche, couche)
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    planche.save(SORTIE)
    print("Planche ecrite :", SORTIE, planche.size)


if __name__ == "__main__":
    main()
