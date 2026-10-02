"""Separe le fond de la ruelle en deux plans pour une vraie parallaxe : le ciel (nuages compris) et les
maisons / toits lointains. Sources : assets-source/ruelle/section-0N/00-arriere-plan.png (panorama 4344 x 1448)
et 01-facades.png (pour reperer les zones cachees, aux pixels de support « etires »).

- ciel.png : degrade vertical (mediane des pixels de ciel propres, sans les bandes claires verticales du pack)
  et nuages recopies tels quels depuis le panorama, repartis sur toute la largeur.
- maisons.png : toits, cheminees et immeubles ; transparent au-dessus de la silhouette. Les pixels de support
  qui se cachaient derriere les piliers de facade sont remplaces par la copie de zones propres voisines.

Aucun pixel n'est dessine : tout vient du panorama fourni. Usage : pip install pillow numpy scipy && python tools/preparer-ruelle-fond.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ruelle"
OUT = RACINE / "public/assets/rooms/ruelle/fond"
SECTIONS = [f"section-0{i}" for i in range(1, 5)]

H = 420  # hauteur utile des plans de fond (les facades commencent a Y ~ 396)
# Maisons : colonnes du panorama utilisees. Partie propre : a droite de l'immeuble de gauche, avant le mur du fond.
HOUSES_X0, HOUSES_X1 = 1060, 3412
SKY_WIDTH = 1700


def panorama(layer, mode):
    return np.concatenate([np.array(Image.open(SRC / s / f"{layer}.png").convert(mode)) for s in SECTIONS], axis=1)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bg = panorama("00-arriere-plan", "RGB")[:H]
    facades = panorama("01-facades", "RGBA")[:, :, 3]
    c = bg.astype(float) / 255
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    v = c.max(axis=2)

    # --- Ciel / non-ciel -------------------------------------------------------------
    skyc = (b >= r - 0.012) & (v > 0.6) & (g >= r - 0.02)
    lab, n = ndimage.label(skyc)
    sizes = ndimage.sum(skyc, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 200])
    non = ~keep
    lab2, n2 = ndimage.label(non)
    sizes2 = ndimage.sum(non, lab2, range(1, n2 + 1))
    non = np.isin(lab2, [i + 1 for i, s in enumerate(sizes2) if s >= 40])
    # Nuages : pixels blancs (peu chauds) du non-ciel ; ils appartiennent au plan du ciel, pas aux maisons.
    cloud_px = non & (v > 0.8) & ((r - b) < 0.13)
    roof_px = non & ~cloud_px
    # Masse des toits : composantes de non-nuage touchant le bas ; le reste flotte (pixels de support isoles).
    lab3, n3 = ndimage.label(roof_px)
    bottom = set(np.unique(lab3[-1])) - {0}
    roof = np.isin(lab3, list(bottom))
    # Nuages : composantes de pixels blancs (hors toits).
    cloud_lab, cloud_n = ndimage.label(ndimage.binary_dilation(cloud_px, iterations=1) & ~roof)

    # --- Ciel -------------------------------------------------------------------------
    sky_pure = ~non
    cols = np.arange(HOUSES_X0, HOUSES_X1)
    # Colonnes sans bande claire : luminosite moyenne du haut du ciel proche de la mediane.
    band = bg[20:120, cols].astype(float).mean(axis=(0, 2))
    ok = cols[np.abs(band - np.median(band)) < 2.5]
    gradient = np.zeros((H, 3))
    last = None
    for y in range(H):
        px = bg[y, ok][sky_pure[y, ok]]
        if len(px) > 25 and y <= 360:
            last = np.median(px, axis=0)
        gradient[y] = last if last is not None else bg[0, ok].mean(axis=0)
    gradient = ndimage.uniform_filter1d(gradient, 9, axis=0, mode="nearest")
    sky = np.repeat(gradient[:, None, :], SKY_WIDTH, axis=1).round().astype(np.uint8)

    # Nuages : composantes flottantes blanches du panorama, recopiees telles quelles a la meme hauteur.
    clouds = []
    for idx in range(1, cloud_n + 1):
        comp = (cloud_lab == idx) & cloud_px
        ys, xs = np.where(comp)
        if len(xs) < 120 or xs.min() < HOUSES_X0 or xs.max() > HOUSES_X1:
            continue
        clouds.append((len(xs), idx, xs.min(), xs.max(), ys.min(), ys.max()))
    clouds.sort(reverse=True)
    rng = np.random.default_rng(7)
    slots = np.linspace(120, SKY_WIDTH - 120, 7)
    placed = 0
    for (_, idx, x0, x1, y0, y1), slot in zip(clouds, slots):
        comp = ndimage.binary_dilation((cloud_lab == idx) & cloud_px, iterations=2) & ~roof & ~(non & ~cloud_px)
        w = x1 - x0 + 1
        dest = int(slot - w / 2 + rng.integers(-40, 40))
        dest = max(0, min(SKY_WIDTH - w, dest))
        sub = comp[y0 - 2 : y1 + 3, x0 - 2 : x1 + 3]
        rgb = bg[y0 - 2 : y1 + 3, x0 - 2 : x1 + 3]
        region = sky[y0 - 2 : y1 + 3, max(0, dest - 2) : dest - 2 + sub.shape[1]]
        sub = sub[:, : region.shape[1]]
        region[sub] = rgb[:, : region.shape[1]][sub]
        placed += 1
    print("nuages places :", placed, "sur", len(clouds))
    Image.fromarray(sky).convert("RGBA").save(OUT / "ciel.png", optimize=True)

    # --- Maisons ----------------------------------------------------------------------
    houses = np.dstack([bg, (roof * 255).astype(np.uint8)])  # opaque seulement sur la masse des toits
    # Zones cachees par les piliers de facade : colonnes ou une facade existe au-dessus de sa ligne de toit.
    hidden_cols = (facades[:380] > 0).any(axis=0)
    hidden_cols = ndimage.binary_dilation(hidden_cols, iterations=12)
    segments = []
    x = HOUSES_X0
    while x < HOUSES_X1:
        if hidden_cols[x]:
            e = x
            while e < HOUSES_X1 and hidden_cols[e]:
                e += 1
            segments.append((x, e))
            x = e
        else:
            x += 1
    print("zones cachees a refaire :", segments)
    dirty = hidden_cols.copy()
    for a, e in segments:
        wseg = e - a
        best = None
        for delta in list(range(-1100, -wseg - 40, 2)) + list(range(wseg + 40, 1100, 2)):
            sa, se = a + delta, e + delta
            if sa < HOUSES_X0 or se > HOUSES_X1 or dirty[sa - 10 : se + 10].any():
                continue
            # Raccord : les 10 colonnes qui bordent la zone doivent ressembler aux colonnes qui bordent la copie.
            def diff(x, y):
                d = np.abs(houses[:, x : x + 10].astype(int) - houses[:, y : y + 10])
                return d[150:, :, :3].mean() + 0.5 * d[150:, :, 3].mean()

            err = diff(a - 10, sa - 10) + diff(e, se)
            if best is None or err < best[0]:
                best = (err, delta)
        assert best, "aucune zone propre pour recopier"
        d = best[1]
        print("  zone", a, e, "<- copie decalee de", d, "erreur de raccord %.1f" % best[0])
        houses[:, a:e] = houses[:, a + d : e + d]
    out = houses[:, HOUSES_X0:HOUSES_X1]
    Image.fromarray(out, "RGBA").save(OUT / "maisons.png", optimize=True)
    print("maisons", out.shape[1], "x", out.shape[0], "| ciel", SKY_WIDTH, "x", H)


if __name__ == "__main__":
    main()
