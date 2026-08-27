#!/usr/bin/env python3
"""
Decoupe une planche de personnage en spritesheet utilisable par le jeu.

Les planches fournies par une IA ne sont pas alignees sur une grille : les
sujets sont poses un peu n'importe ou, avec des tailles et des espacements
irreguliers. Ce script ne suppose donc aucune grille. Il repere chaque sujet
par ses pixels opaques, regroupe les sujets en rangees, puis recompose une
planche propre a pas fixe.

Prerequis : Python 3 avec Pillow et numpy.
    pip install pillow numpy

Usage :
    python3 tools/decouper-planche.py

Le decoupage n'est a refaire que si la planche source change : le resultat est
versionne dans public/assets/.
"""

from __future__ import annotations

import sys
from collections import deque
from dataclasses import dataclass
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Dependances manquantes. Lancer : pip install pillow numpy")

RACINE = Path(__file__).resolve().parent.parent

SOURCE = RACINE / "assets-source/raw/heros_planche_01.png"
SORTIE = RACINE / "public/assets/sprites/heros.png"

# Dimensions d'une image dans la planche produite.
LARGEUR_IMAGE = 32
HAUTEUR_IMAGE = 48

# Un pixel compte comme faisant partie d'un sujet au dela de cette opacite.
SEUIL_OPACITE = 40

# Un amas de moins de tant de pixels est du bruit, pas un personnage.
TAILLE_MIN_SUJET = 200

# Deux sujets appartiennent a la meme rangee si leurs sommets sont proches.
TOLERANCE_RANGEE = 60

# En dessous de cette opacite, un pixel du resultat devient franchement
# transparent : la reduction laisse sinon un halo de pixels a moitie visibles
# tout autour du personnage.
SEUIL_OPACITE_SORTIE = 80


@dataclass(frozen=True)
class Rangee:
    """Une rangee de la planche source et son role dans le jeu."""

    lettre: str
    direction: str
    description: str


# Correspondance entre les rangees de la planche et les directions du jeu.
#
# Seules les quatre rangees de marche sont reprises : mesurees a 102-103 pixels
# de haut, elles partagent la meme echelle. Les rangees de pose fixe font 110 a
# 115 pixels : les melanger ferait grandir le personnage quand il s'arrete.
#
# L'ordre ci-dessous est celui des lignes de la planche produite, et doit rester
# accorde a la constante DIRECTIONS de src/systems/Animations.ts.
RANGEES = [
    Rangee("F", "bas", "marche de face"),
    Rangee("E", "gauche", "marche de profil vers la gauche"),
    Rangee("D", "droite", "marche de profil vers la droite"),
    Rangee("G", "haut", "marche de dos"),
]


def trouver_sujets(alpha: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Repere chaque sujet de la planche et renvoie son cadre englobant."""
    hauteur, largeur = alpha.shape
    opaque = alpha >= SEUIL_OPACITE
    vu = np.zeros_like(opaque)
    cadres = []

    for y in range(hauteur):
        for x in range(largeur):
            if not opaque[y, x] or vu[y, x]:
                continue

            file = deque([(x, y)])
            vu[y, x] = True
            x0 = x1 = x
            y0 = y1 = y
            taille = 0

            while file:
                cx, cy = file.popleft()
                taille += 1
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)

                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < largeur and 0 <= ny < hauteur:
                            if opaque[ny, nx] and not vu[ny, nx]:
                                vu[ny, nx] = True
                                file.append((nx, ny))

            if taille >= TAILLE_MIN_SUJET:
                cadres.append((x0, y0, x1, y1))

    return cadres


def grouper_en_rangees(
    cadres: list[tuple[int, int, int, int]],
) -> list[list[tuple[int, int, int, int]]]:
    """Regroupe les sujets par rangee, de haut en bas puis de gauche a droite."""
    cadres = sorted(cadres, key=lambda c: c[1])
    rangees: list[list[tuple[int, int, int, int]]] = []
    courante = [cadres[0]]

    for cadre in cadres[1:]:
        if cadre[1] - courante[-1][1] < TOLERANCE_RANGEE:
            courante.append(cadre)
        else:
            rangees.append(sorted(courante, key=lambda c: c[0]))
            courante = [cadre]

    rangees.append(sorted(courante, key=lambda c: c[0]))
    return rangees


def ancre_horizontale(alpha_sujet: np.ndarray) -> float:
    """
    Position horizontale sur laquelle centrer le sujet dans son image.

    Le centre du cadre englobant ne convient pas : pendant la marche, les bras
    et les jambes s'ecartent tantot a gauche tantot a droite, et le personnage
    semblerait glisser lateralement. On ne retient donc que le haut du corps,
    tete et buste, dont la position reste stable d'une image a l'autre.
    """
    haut_du_corps = alpha_sujet[: int(alpha_sujet.shape[0] * 0.7)]
    ys, xs = np.nonzero(haut_du_corps >= SEUIL_OPACITE)
    return float(xs.mean())


def reduire(sujet: Image.Image, largeur: int, hauteur: int) -> Image.Image:
    """
    Reduit un sujet en preservant la couleur de ses bords.

    Les pixels transparents de la planche ne sont pas neutres : ils portent la
    couleur sombre du fond d'origine. Reduits tels quels, ils deverseraient ce
    gris sombre sur le contour du personnage, qui se retrouverait cercle d'un
    lisere sale. On multiplie donc chaque couleur par son opacite avant de
    reduire, puis on annule l'operation ensuite.
    """
    donnees = np.asarray(sujet, dtype=np.float64)
    couleurs, opacite = donnees[..., :3], donnees[..., 3:4]

    premultiplie = np.concatenate([couleurs * (opacite / 255.0), opacite], axis=2)
    reduit = Image.fromarray(premultiplie.astype(np.uint8), "RGBA").resize(
        (largeur, hauteur), Image.LANCZOS
    )

    resultat = np.asarray(reduit, dtype=np.float64)
    couleurs, opacite = resultat[..., :3], resultat[..., 3:4]

    # Le retour aux couleurs reelles divise par l'opacite ; la borne evite une
    # division par zero sur les pixels devenus entierement transparents.
    couleurs = np.divide(couleurs, np.maximum(opacite / 255.0, 1e-6))
    opacite = np.where(opacite < SEUIL_OPACITE_SORTIE, 0.0, opacite)

    final = np.concatenate([np.clip(couleurs, 0, 255), opacite], axis=2)
    return Image.fromarray(final.astype(np.uint8), "RGBA")


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f"Planche introuvable : {SOURCE}")

    planche = Image.open(SOURCE).convert("RGBA")
    alpha = np.asarray(planche)[..., 3]

    rangees = grouper_en_rangees(trouver_sujets(alpha))
    par_lettre = {chr(65 + i): r for i, r in enumerate(rangees)}

    print(f"Planche source : {SOURCE.name} ({planche.width}x{planche.height})")
    print(f"Rangees detectees : {[len(r) for r in rangees]}\n")

    manquantes = [r.lettre for r in RANGEES if r.lettre not in par_lettre]
    if manquantes:
        sys.exit(f"Rangees absentes de la planche : {', '.join(manquantes)}")

    images_par_direction = max(len(par_lettre[r.lettre]) for r in RANGEES)

    # L'echelle est commune a toutes les rangees, calculee sur le sujet le plus
    # haut : une echelle par rangee ferait changer le personnage de taille en
    # tournant. Une marge d'un pixel evite que les cheveux touchent le bord.
    plus_haut = max(
        y1 - y0 + 1 for r in RANGEES for (_, y0, _, y1) in par_lettre[r.lettre]
    )
    echelle = (HAUTEUR_IMAGE - 1) / plus_haut

    sortie = Image.new(
        "RGBA",
        (LARGEUR_IMAGE * images_par_direction, HAUTEUR_IMAGE * len(RANGEES)),
        (0, 0, 0, 0),
    )

    for ligne, rangee in enumerate(RANGEES):
        cadres = par_lettre[rangee.lettre]
        largeurs = []

        for colonne, (x0, y0, x1, y1) in enumerate(cadres):
            sujet = planche.crop((x0, y0, x1 + 1, y1 + 1))

            largeur = max(1, round(sujet.width * echelle))
            hauteur = max(1, round(sujet.height * echelle))
            petit = reduire(sujet, largeur, hauteur)
            largeurs.append(largeur)

            ancre = ancre_horizontale(np.asarray(sujet)[..., 3]) * echelle
            gauche = round(LARGEUR_IMAGE / 2 - ancre)
            # Les pieds se posent au bas de l'image : le point d'ancrage du
            # personnage dans le jeu est donc le milieu du bord inferieur.
            haut = HAUTEUR_IMAGE - hauteur

            sortie.alpha_composite(
                petit, (colonne * LARGEUR_IMAGE + gauche, ligne * HAUTEUR_IMAGE + haut)
            )

            if gauche < 0 or gauche + largeur > LARGEUR_IMAGE:
                print(
                    f"  ATTENTION rangee {rangee.lettre} image {colonne} : "
                    f"{largeur}px de large deborde du cadre de {LARGEUR_IMAGE}px"
                )

        print(
            f"  ligne {ligne} <- rangee {rangee.lettre}  {rangee.direction:7s} "
            f"{len(cadres)} images, largeurs {largeurs}  ({rangee.description})"
        )

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    sortie.save(SORTIE)

    print(
        f"\nPlanche produite : {SORTIE.relative_to(RACINE)} "
        f"({sortie.width}x{sortie.height}, images de {LARGEUR_IMAGE}x{HAUTEUR_IMAGE})"
    )


if __name__ == "__main__":
    main()
