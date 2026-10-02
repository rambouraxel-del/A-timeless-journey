"""Reconstitue le fond de la ruelle en deux panoramas continus : le ciel (nuages compris) et les maisons /
toits lointains. Sources : assets-source/ruelle/section-0N/00-arriere-plan.png (panorama 4344 x 1448) et
01-facades.png (pour reperer les zones cachees derriere les piliers, ou le pack n'a que des pixels de
support « etires »).

- ciel.png : degrade vertical continu (courbe lissee ajustee sur le ciel propre, sans les bandes claires du
  pack) ; nuages recopies du panorama avec un vrai canal alpha (aucun rectangle de ciel autour).
- maisons.png : panorama des toits, cheminees et immeubles, transparent au-dessus de la silhouette. Il est
  assemble a partir des seules colonnes propres du pack, coupees la ou les deux cotes se raccordent le mieux
  (silhouette et couleurs) ; les trous, ilots flottants et franges bleutees sont retires.

Aucun pixel n'est dessine ni etire : tout vient du panorama fourni.
Usage : pip install pillow numpy scipy && python tools/preparer-ruelle-fond.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "assets-source/ruelle"
OUT = RACINE / "public/assets/rooms/ruelle/fond"
SECTIONS = [f"section-0{i}" for i in range(1, 5)]

H = 440  # hauteur des plans de fond (les facades commencent a Y ~ 396)
SKY_WIDTH = 1700
HOUSES_WIDTH = 3300  # couvre toute la course de la camera au facteur 0,65 (voir HOUSES dans src/data/rooms/ruelle.ts)
BLOCK = 3  # le pack est du pixel art agrandi x3 : les coupes tombent sur des multiples de 3
CTX = 15  # colonnes comparees de part et d'autre d'une coupe


def panorama(layer, mode):
    return np.concatenate([np.array(Image.open(SRC / s / f"{layer}.png").convert(mode)) for s in SECTIONS], axis=1)


def classify(bg):
    """Retourne (roof, cloud_t, sky_rgb_mask) : toits opaques, canal de nuage 0..1 et masque de ciel."""
    c = bg.astype(float) / 255
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    v = c.max(axis=2)
    skyc = (b >= r - 0.012) & (v > 0.6) & (g >= r - 0.02)
    lab, n = ndimage.label(skyc)
    sizes = ndimage.sum(skyc, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 200])
    non = ~keep
    lab2, n2 = ndimage.label(non)
    sizes2 = ndimage.sum(non, lab2, range(1, n2 + 1))
    non = np.isin(lab2, [i + 1 for i, s in enumerate(sizes2) if s >= 40])
    cloud_px = non & (v > 0.8) & ((r - b) < 0.13)
    roof_px = non & ~cloud_px
    lab3, _ = ndimage.label(roof_px)
    bottom = set(np.unique(lab3[-1])) - {0}
    roof = np.isin(lab3, list(bottom))
    # Trous : poches de non-toit entourees de toit (fenetres, aplats clairs) -> toit. Le ciel touche le haut.
    transp = ~roof
    lt, nt = ndimage.label(transp)
    top = set(np.unique(lt[0])) - {0}
    st = ndimage.sum(transp, lt, range(1, nt + 1))
    holes = np.isin(lt, [i + 1 for i, s in enumerate(st) if s < 3000 and (i + 1) not in top])
    roof = roof | holes
    # Franges : pixels de bord trop proches de la couleur du ciel -> ciel.
    edge = roof & ~ndimage.binary_erosion(roof, iterations=1)
    fringe = edge & (b > r + 0.12) & (v > 0.62)
    roof = roof & ~fringe
    # Ilots de toit flottants (moins de 80 pixels) supprimes.
    lab4, n4 = ndimage.label(roof)
    s4 = ndimage.sum(roof, lab4, range(1, n4 + 1))
    roof = np.isin(lab4, [i + 1 for i, s in enumerate(s4) if s >= 80])
    return roof, c, non


def build_sky(bg, roof, c, hidden_cols):
    """Degrade continu + nuages detoures (alpha) recopies du panorama."""
    H_, W_ = roof.shape
    cols = np.arange(1041, 4034)
    cols = cols[~hidden_cols[cols]]
    # Pixels de ciel pur (ni toit ni nuage) : mediane par ligne, sur les colonnes sans bande claire.
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    v = c.max(axis=2)
    cloudish = c.min(axis=2) > 0.7
    pure = ~roof & ~cloudish & (b >= r)
    band = bg[20:120, cols].astype(float).mean(axis=(0, 2))
    ok = cols[np.abs(band - np.median(band)) < 3.5]
    ys, med = [], []
    for y in range(0, 340):
        px = bg[y, ok][pure[y, ok]]
        if len(px) > 120:
            ys.append(y)
            med.append(np.median(px, axis=0))
    ys, med = np.array(ys), np.array(med)
    # Degrade lisse : medianes interpolees puis filtre gaussien, prolonge en palier sous la derniere ligne fiable.
    yy = np.arange(H_)
    gradient = np.stack([np.interp(yy, ys, med[:, k]) for k in range(3)], axis=1)
    gradient = ndimage.gaussian_filter1d(gradient, 10, axis=0, mode="nearest")
    gradient = np.clip(gradient, 0, 255)
    sky = np.repeat(gradient[:, None, :], SKY_WIDTH, axis=1)

    # Nuages : canal t (0 ciel, 1 blanc) par rapport au ciel local, composantes entieres (sans toit).
    white = np.array([250.0, 246.0, 236.0])
    clouds = []
    # ciel local : mediane des pixels purs voisins (par ligne, large fenetre) -> reference d'avant degrade
    local = np.zeros((H_, W_, 3))
    row_med = np.zeros((H_, 3))
    for y in range(H_):
        px = bg[y][pure[y]]
        row_med[y] = np.median(px, axis=0) if len(px) > 100 else (row_med[y - 1] if y else bg[0].mean(axis=0))
    local[:] = row_med[:, None, :]
    d = bg.astype(float) - local
    w = white - local
    t = np.clip((d * w).sum(axis=2) / np.maximum((w * w).sum(axis=2), 1), 0, 1.2)
    mask = (t > 0.18) & ~roof & (c.min(axis=2) > 0.62)
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=1) & ~roof)
    near_roof = ndimage.binary_dilation(roof, iterations=3)
    for idx in range(1, n + 1):
        comp = lab == idx
        ys_, xs_ = np.where(comp)
        if len(xs_) < 150 or xs_.min() < 1041 or xs_.max() > 4034 or ys_.max() > 335 or near_roof[comp].any():
            continue
        clouds.append((len(xs_), idx, xs_.min(), xs_.max(), ys_.min(), ys_.max()))
    clouds.sort(reverse=True)
    rng = np.random.default_rng(11)
    slots = np.linspace(110, SKY_WIDTH - 110, 8)
    for (_, idx, x0, x1, y0, y1), slot in zip(clouds, slots):
        comp = (lab == idx) & (t > 0.12) & (c.min(axis=2) > 0.62)
        alpha = np.where(t > 0.88, 1.0, np.where(t < 0.18, 0.0, t))  # contours nets
        # blanc du nuage : mediane des pixels pleins
        full = comp & (t > 0.9)
        cw = np.median(bg[full], axis=0) if full.sum() > 20 else white
        wcl = x1 - x0 + 1
        dest = int(slot - wcl / 2 + rng.integers(-40, 40))
        dest = max(0, min(SKY_WIDTH - wcl, dest))
        dest -= dest % BLOCK
        for yy_ in range(y0, y1 + 1):
            for xx_ in range(x0, x1 + 1):
                if comp[yy_, xx_]:
                    a = alpha[yy_, xx_]
                    # pixels pleins : couleur d'origine (ombres comprises) ; bords : melange avec le degrade
                    col = bg[yy_, xx_] if a >= 1.0 else cw
                    sky[yy_, dest + xx_ - x0] = sky[yy_, dest + xx_ - x0] * (1 - a) + col * a
    print("nuages places :", min(len(clouds), len(slots)), "sur", len(clouds))
    return np.dstack([sky.round().astype(np.uint8), np.full((H_, SKY_WIDTH), 255, np.uint8)])


def clean_intervals(hidden_cols, x0=1041, x1=4034):
    out, x = [], x0
    while x < x1:
        if hidden_cols[x]:
            x += 1
            continue
        e = x
        while e < x1 and not hidden_cols[e]:
            e += 1
        out.append((x, e))
        x = e
    return out


def seam_context(feat, col):
    """Colonnes [col-CTX, col) aplaties : contexte a gauche d'une coupe."""
    return feat[:, col - CTX : col].reshape(-1)


# Grande toiture continue du panorama source : elle n'est interrompue que par la zone cachee derriere un pilier
# (X 2442 a 2543). C'est la seule portion longue dont les cheminees, lucarnes et la ligne de faite sont complets.
ROOF_START, ROOF_END = 2222, 2982
GAP = (2442, 2543)


def build_houses(rgba, hidden_cols):
    """Panorama continu des maisons.

    1. La grande toiture est refermee sur elle-meme : la zone cachee derriere le pilier est franchie par une coupe
       prise dans la toiture (colonnes de faite plates, couleurs et silhouette les plus proches).
    2. La toiture est ensuite prolongee par symetrie : chaque copie en miroir se raccorde a la precedente par sa
       propre derniere colonne, donc sans coupe, sans marche de silhouette ni fragment flottant. Aucune colonne
       n'est etiree ni floue.
    """
    alpha = rgba[:, :, 3] > 0
    top = np.where(alpha[:396].any(axis=0), alpha[:396].argmax(axis=0), 396).astype(float)
    rows = slice(90, H, 2)
    feat = np.concatenate([np.where(rgba[..., 3:4] > 0, rgba[..., :3], 0).astype(np.float32), 1.6 * rgba[..., 3:4].astype(np.float32)], axis=2)
    feat = np.ascontiguousarray(feat[rows].transpose(0, 2, 1))

    def ctx(c):
        return feat[:, :, c - CTX : c].reshape(-1)

    def flat(c):
        w = top[c - CTX : c]
        return w.max() - w.min() <= 4

    # Raccord de la zone cachee : (e, s) avec e avant la zone, s apres.
    # Pivots de symetrie : colonnes de faite plat, de part et d'autre (une symetrie sur un chemin de faite plat
    # prolonge la toiture sans marche ni trou entre deux cheminees).
    p0 = next(c for c in range(2340, GAP[0], BLOCK) if flat(c) and top[c - 1] < 340)
    p1 = max(c for c in range(2820, ROOF_END - 12, BLOCK) if flat(c) and top[c - 1] < 340)
    es = [c for c in range(p0 + 30 + (-(p0 + 30) % BLOCK), GAP[0] + 1, BLOCK) if flat(c)]
    ss = [c for c in range(GAP[1] + CTX + (-(GAP[1] + CTX) % BLOCK), GAP[1] + 150, BLOCK) if flat(c)]
    best = None
    for e in es:
        for s_ in ss:
            d = float(((ctx(e) - ctx(s_)) ** 2).mean()) + 0.3 * ((GAP[0] - e) + (s_ - GAP[1]))
            if best is None or d < best[0]:
                best = (d, e, s_)
    cost, e, s_ = best
    print("raccord de la zone cachee : colonne %d -> %d (ecart quadratique moyen %.1f)" % (e, s_, cost))
    run = np.concatenate([np.arange(p0, e), np.arange(s_, p1)])
    print('pivots de symetrie :', p0, p1)
    print("toiture continue :", len(run), "colonnes")
    mirror = run[::-1]
    seq, flip = [], False
    while sum(len(x) for x in seq) < HOUSES_WIDTH:
        seq.append(mirror if flip else run)
        flip = not flip
    cols = np.concatenate(seq)[:HOUSES_WIDTH]
    print("symetries aux colonnes :", [len(run) * (k + 1) for k in range(len(seq) - 1)])
    return rgba[:, cols], [len(run) * (k + 1) for k in range(len(seq) - 1)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bg = panorama("00-arriere-plan", "RGB")[:H]
    facades = panorama("01-facades", "RGBA")[:, :, 3]
    roof, c, _ = classify(bg)
    hidden_cols = ndimage.binary_dilation((facades[:380] > 0).any(axis=0), iterations=10)

    sky = build_sky(bg, roof, c, hidden_cols)
    Image.fromarray(sky, "RGBA").save(OUT / "ciel.png", optimize=True)

    rgba = np.dstack([bg, (roof * 255).astype(np.uint8)])
    rgba[~roof, :3] = 0
    rgba[412:, 3] = 0  # sous la ligne des facades : jamais visible
    houses, seams = build_houses(rgba, hidden_cols)
    Image.fromarray(houses, "RGBA").save(OUT / "maisons.png", optimize=True)
    print("maisons", houses.shape[1], "x", houses.shape[0], "| ciel", SKY_WIDTH, "x", H)


if __name__ == "__main__":
    main()
