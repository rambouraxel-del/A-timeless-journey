"""Decoupe les planches d'UI (assets-source/ui/) en images pretes pour le jeu (public/assets/ui/).

Chaque element est reduit a sa taille d'affichage exacte dans l'ecran logique 360 px de large :
le jeu l'affiche ensuite a 1:1, sans reechantillonnage.
Aucun pixel n'est invente : les cadres "vides" (coeurs, jauge) sont obtenus en recopiant
des colonnes de pixels deja presentes dans les planches.

Usage : pip install pillow && python tools/decouper-ui.py
"""
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ui"
OUT = RACINE / "public/assets/ui"

HUD = Image.open(SRC / "planche-hud.png").convert("RGBA")
BOUTONS = Image.open(SRC / "planche-boutons.png").convert("RGBA")
ORNEMENTS = Image.open(SRC / "planche-ornements.png").convert("RGBA")


def nettoyer(img):
    """Met a zero la couleur des pixels invisibles (evite les halos rouges au redimensionnement)."""
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            if px[x, y][3] < 8:
                px[x, y] = (0, 0, 0, 0)
    return img


def reduire(img, largeur=None, hauteur=None):
    if largeur is None:
        largeur = round(img.width * hauteur / img.height)
    if hauteur is None:
        hauteur = round(img.height * largeur / img.width)
    return nettoyer(img).convert("RGBa").resize((largeur, hauteur), Image.LANCZOS).convert("RGBA")


def sauver(nom, img):
    img.save(OUT / f"{nom}.png")
    print(f"{nom:24s} {img.width}x{img.height}")


def etirer_colonne(img, x_src, largeur_src, x0, x1, y0, y1):
    """Recouvre [x0, x1[ x [y0, y1[ en repetant une bande verticale prise en x_src."""
    bande = img.crop((x_src, y0, x_src + largeur_src, y1))
    for x in range(x0, x1, largeur_src):
        img.paste(bande.crop((0, 0, min(largeur_src, x1 - x), bande.height)), (x, y0))


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # --- HUD ------------------------------------------------------------------
    ECHELLE_CADRES = 0.19
    sauver("hud_emblem", reduire(HUD.crop((23, 22, 409, 412)), 56))

    # Cadre des coeurs : on efface les 5 coeurs (bande vide prise entre 2 coeurs), puis on
    # retire la 5e case pour n'en garder que 4, comme sur la maquette.
    coeurs = HUD.copy()
    etirer_colonne(coeurs, 553, 10, 485, 862, 137, 213)
    cadre = Image.new("RGBA", ((782 - 421) + (947 - 857), 118))
    cadre.paste(coeurs.crop((421, 116, 782, 234)), (0, 0))
    cadre.paste(coeurs.crop((857, 116, 947, 234)), (782 - 421, 0))
    sauver("hud_hearts_frame", reduire(cadre, round(cadre.width * ECHELLE_CADRES)))
    sauver("hud_heart_full", reduire(HUD.crop((997, 131, 1085, 213)), 12))
    sauver("hud_heart_empty", reduire(HUD.crop((1327, 130, 1417, 213)), 12))

    # Cadre d'energie : jauge videe (couleur de fond de jauge), raccourcie comme le cadre des coeurs.
    energie = HUD.copy()
    etirer_colonne(energie, 820, 6, 578, 868, 298, 327)
    coupe = (700, 775)
    cadre = Image.new("RGBA", ((coupe[0] - 421) + (947 - coupe[1]), 124))
    cadre.paste(energie.crop((421, 250, coupe[0], 374)), (0, 0))
    cadre.paste(energie.crop((coupe[1], 250, 947, 374)), (coupe[0] - 421, 0))
    sauver("hud_energy_frame", reduire(cadre, round(cadre.width * ECHELLE_CADRES)))
    # Bande de remplissage (etiree en largeur par le jeu).
    sauver("hud_energy_fill", reduire(HUD.crop((640, 298, 652, 327)), 2, round(29 * ECHELLE_CADRES)))

    sauver("btn_menu", reduire(BOUTONS.crop((1087, 299, 1337, 543)), 34))

    # --- Controles -------------------------------------------------------------
    sauver("joystick_base", reduire(BOUTONS.crop((91, 59, 641, 601)), 124))
    sauver("joystick_thumb", reduire(BOUTONS.crop((713, 295, 968, 547)), 42))
    sauver("btn_interact", reduire(BOUTONS.crop((34, 636, 427, 1026)), 92))
    sauver("btn_interact_pressed", reduire(BOUTONS.crop((442, 636, 835, 1026)), 92))
    sauver("btn_run", reduire(BOUTONS.crop((856, 732, 1139, 1019)), 62))
    sauver("btn_run_pressed", reduire(BOUTONS.crop((1150, 732, 1433, 1019)), 62))

    # --- Dialogue --------------------------------------------------------------
    sauver("dialogue_box", reduire(HUD.crop((24, 488, 1425, 824)), 340))
    sauver("dialogue_nameplate", reduire(HUD.crop((503, 908, 828, 1009)), 64))
    sauver("marker_interact", reduire(HUD.crop((1217, 348, 1347, 480)), 16))

    # --- Ornements du panneau --------------------------------------------------
    sauver("orn_astral", reduire(ORNEMENTS.crop((29, 2, 590, 569)), 104))
    sauver("orn_mountains", reduire(ORNEMENTS.crop((15, 928, 1434, 1072)), 360))
    sauver("orn_separator", reduire(ORNEMENTS.crop((774, 767, 1271, 826)), 200))
    sauver("orn_corner", reduire(ORNEMENTS.crop((705, 706, 795, 782)), 18))


if __name__ == "__main__":
    main()
