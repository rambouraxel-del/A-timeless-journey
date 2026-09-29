"""Decoupe les planches d'UI (assets-source/ui/) en images haute definition pour le jeu.

Le jeu est dessine a la resolution reelle de l'ecran : un pixel "logique" du jeu vaut D pixels
d'ecran (D = 2, 3 ou 4 selon l'appareil). On produit donc 3 jeux d'images, un par densite :
public/assets/ui/x2/, x3/, x4/. Le jeu charge celui qui correspond a l'appareil et l'affiche
sans aucun reechantillonnage.

Chaque image est preparee a  (largeur logique) x K x D  pixels, K etant la marge de
grossissement prevue pour les grands ecrans (les commandes grandissent jusqu'a x1,3).
On ne depasse jamais la taille de la planche d'origine : aucun pixel n'est invente.

Ecrit aussi src/config/UiSizes.generated.ts (tailles logiques utilisees par le jeu).

Usage : pip install pillow && python tools/decouper-ui.py
"""
from pathlib import Path

from PIL import Image, ImageOps

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ui"
OUT = RACINE / "public/assets/ui"
DENSITES = (2, 3, 4)

HUD = Image.open(SRC / "planche-hud.png").convert("RGBA")
BOUTONS = Image.open(SRC / "planche-boutons.png").convert("RGBA")
ORNEMENTS = Image.open(SRC / "planche-ornements.png").convert("RGBA")

TAILLES = {}


def nettoyer(img):
    """Met a zero la couleur des pixels invisibles (evite les halos au redimensionnement)."""
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            if px[x, y][3] < 8:
                px[x, y] = (0, 0, 0, 0)
    return img


def sauver(nom, img, largeur_logique, k=1.0):
    """largeur_logique : largeur d'affichage dans l'ecran logique (echelle 1). k : marge de grossissement."""
    img = nettoyer(img).convert("RGBa")
    hauteur_logique = round(largeur_logique * img.height / img.width, 2)
    TAILLES[nom] = {"w": largeur_logique, "h": hauteur_logique}
    infos = []
    for d in DENSITES:
        largeur = min(img.width, round(largeur_logique * k * d))
        hauteur = round(img.height * largeur / img.width)
        sortie = img.resize((largeur, hauteur), Image.LANCZOS).convert("RGBA")
        dossier = OUT / f"x{d}"
        dossier.mkdir(parents=True, exist_ok=True)
        sortie.save(dossier / f"{nom}.png", optimize=True)
        infos.append(f"x{d}={largeur}x{hauteur}")
    print(f"{nom:22s} logique {largeur_logique}x{hauteur_logique}  {' '.join(infos)}")


def etirer_colonne(img, x_src, largeur_src, x0, x1, y0, y1):
    """Recouvre [x0, x1[ x [y0, y1[ en repetant une bande verticale prise en x_src."""
    bande = img.crop((x_src, y0, x_src + largeur_src, y1))
    for x in range(x0, x1, largeur_src):
        img.paste(bande.crop((0, 0, min(largeur_src, x1 - x), bande.height)), (x, y0))


def main():
    # --- HUD (taille fixe, pas de grossissement) --------------------------------
    sauver("hud_emblem", HUD.crop((23, 22, 409, 412)), 56)

    # Cadre des coeurs : on efface les 5 coeurs (bande vide prise entre 2 coeurs), puis on
    # retire la 5e case pour n'en garder que 4, comme sur la maquette.
    coeurs = HUD.copy()
    etirer_colonne(coeurs, 553, 10, 485, 862, 137, 213)
    cadre = Image.new("RGBA", ((782 - 421) + (947 - 857), 118))
    cadre.paste(coeurs.crop((421, 116, 782, 234)), (0, 0))
    cadre.paste(coeurs.crop((857, 116, 947, 234)), (782 - 421, 0))
    sauver("hud_hearts_frame", cadre, 86)
    sauver("hud_heart_full", HUD.crop((997, 131, 1085, 213)), 12)
    sauver("hud_heart_empty", HUD.crop((1327, 130, 1417, 213)), 12)

    # Cadre d'energie : jauge videe (couleur de fond de jauge), raccourcie comme le cadre des coeurs.
    energie = HUD.copy()
    etirer_colonne(energie, 820, 6, 578, 868, 298, 327)
    coupe = (700, 775)
    cadre = Image.new("RGBA", ((coupe[0] - 421) + (947 - coupe[1]), 124))
    cadre.paste(energie.crop((421, 250, coupe[0], 374)), (0, 0))
    cadre.paste(energie.crop((coupe[1], 250, 947, 374)), (coupe[0] - 421, 0))
    sauver("hud_energy_frame", cadre, 86)
    sauver("hud_energy_fill", HUD.crop((640, 298, 652, 327)), 2)

    sauver("btn_menu", BOUTONS.crop((1087, 299, 1337, 543)), 34)

    # --- Controles (grossissent jusqu'a x1,3 sur les ecrans allonges) -----------
    sauver("joystick_base", BOUTONS.crop((91, 59, 641, 601)), 128, 1.3)
    sauver("joystick_thumb", BOUTONS.crop((713, 295, 968, 547)), 44, 1.3)
    sauver("btn_interact", BOUTONS.crop((34, 636, 427, 1026)), 96, 1.3)
    sauver("btn_interact_pressed", BOUTONS.crop((442, 636, 835, 1026)), 96, 1.3)
    sauver("btn_run", BOUTONS.crop((856, 732, 1139, 1019)), 66, 1.3)
    sauver("btn_run_pressed", BOUTONS.crop((1150, 732, 1433, 1019)), 66, 1.3)

    # --- Dialogue (affiche jusqu'a 420 px de large : 340 x 1,25) ----------------
    # Cadre redimensionnable (neuf parties) : bordure exterieure gauche + debut et fin du cadre de
    # texte, sans le portrait ni le motif ; le motif celeste est remis en image separee.
    boite = HUD.copy()
    etirer_colonne(boite, 520, 6, 1190, 1364, 548, 779)  # efface motif et fleche (fond uni)
    bord_droit = boite.crop((1405, 488, 1425, 824))
    cadre = Image.new("RGBA", (20 + (460 - 374) + (1425 - 1190), 336))
    cadre.paste(ImageOps.mirror(bord_droit), (0, 0))
    cadre.paste(boite.crop((374, 488, 460, 824)), (20, 0))
    cadre.paste(boite.crop((1190, 488, 1425, 824)), (20 + 86, 0))
    sauver("dialogue_frame", cadre, round(cadre.width * 0.243, 2))
    sauver("dialogue_motif", HUD.crop((1075, 545, 1368, 782)), round(293 * 0.243, 2))
    sauver("dialogue_portrait", HUD.crop((188, 828, 452, 1068)), 64, 1.5)
    sauver("dialogue_nameplate", HUD.crop((503, 908, 828, 1009)), 64, 1.25)
    sauver("marker_interact", HUD.crop((1217, 348, 1347, 480)), 16, 1.25)

    # --- Ornements du panneau ---------------------------------------------------
    sauver("orn_astral", ORNEMENTS.crop((29, 2, 590, 569)), 112, 1.3)
    sauver("orn_mountains", ORNEMENTS.crop((15, 928, 1434, 1072)), 440)
    sauver("orn_separator", ORNEMENTS.crop((774, 767, 1271, 826)), 200, 1.2)
    sauver("orn_corner", ORNEMENTS.crop((705, 706, 795, 782)), 18)

    lignes = ["// Fichier genere par tools/decouper-ui.py : ne pas modifier a la main.",
              "// Taille d'affichage (en pixels logiques, echelle 1) de chaque element d'interface.",
              "export const UiSizes = {"]
    for nom, t in TAILLES.items():
        lignes.append(f"  {nom}: {{ w: {t['w']}, h: {t['h']} }},")
    lignes.append("} as const;")
    lignes.append("")
    lignes.append("export type UiKey = keyof typeof UiSizes;")
    (RACINE / "src/config/UiSizes.generated.ts").write_text("\n".join(lignes) + "\n")


if __name__ == "__main__":
    main()
