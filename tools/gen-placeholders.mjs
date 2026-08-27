/**
 * Generation des assets temporaires.
 *
 * Ces visuels ne sont pas destines a rester : ils servent a construire et tester
 * tous les systemes du jeu avant l'arrivee des vrais assets. Ils respectent
 * exactement les memes dimensions et les memes noms de fichiers que les assets
 * definitifs, pour que la substitution ne demande aucune modification du code.
 *
 * Usage : npm run gen:placeholders
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Bitmap, createRandom } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TILE = 16;
const CHAR_W = 16;
const CHAR_H = 24;

/** Palette commune a tous les placeholders : garde l'ensemble visuellement coherent. */
const PALETTE = {
  contour: [27, 29, 42],

  herbeClaire: [106, 156, 74],
  herbeFoncee: [82, 128, 58],
  cheminClair: [176, 148, 102],
  cheminFonce: [148, 121, 79],
  sableClair: [216, 196, 143],
  sableFonce: [193, 172, 120],
  eauClaire: [63, 123, 181],
  eauFoncee: [47, 95, 146],
  rocherClair: [123, 127, 138],
  rocherFonce: [90, 94, 105],
  arbreClair: [47, 93, 56],
  arbreFonce: [36, 74, 44],
  metalClair: [58, 64, 84],
  metalFonce: [44, 49, 66],
  metalMur: [86, 95, 122],
  accent: [107, 214, 196],

  peau: [232, 195, 158],
  peauOmbre: [201, 163, 127],
  cheveux: [74, 59, 42],
  tunique: [107, 214, 196],
  tuniqueOmbre: [78, 168, 152],
  pantalon: [58, 64, 84],
};

// ---------------------------------------------------------------------------
// Tuiles
// ---------------------------------------------------------------------------

/**
 * Ordre des tuiles dans la planche. L'index est l'identifiant utilise par le
 * jeu : il ne doit jamais changer sans mettre a jour les cartes existantes.
 */
const TILE_DEFINITIONS = [
  { nom: 'herbe', dessine: tuileMouchetee(PALETTE.herbeClaire, PALETTE.herbeFoncee, 26) },
  { nom: 'chemin', dessine: tuileMouchetee(PALETTE.cheminClair, PALETTE.cheminFonce, 18) },
  { nom: 'sable', dessine: tuileMouchetee(PALETTE.sableClair, PALETTE.sableFonce, 14) },
  { nom: 'eau', dessine: tuileEau },
  { nom: 'rocher', dessine: tuileRocher },
  { nom: 'arbre', dessine: tuileArbre },
  { nom: 'sol_vaisseau', dessine: tuileSolVaisseau },
  { nom: 'mur_vaisseau', dessine: tuileMurVaisseau },
];

/** Fabrique une tuile de sol : un fond uni mouchete de pixels plus sombres. */
function tuileMouchetee(couleurFond, couleurTache, nombreTaches) {
  return (bmp, ox, oy, random) => {
    bmp.rect(ox, oy, TILE, TILE, couleurFond);
    for (let i = 0; i < nombreTaches; i += 1) {
      const x = ox + Math.floor(random() * TILE);
      const y = oy + Math.floor(random() * TILE);
      bmp.set(x, y, couleurTache);
    }
  };
}

function tuileEau(bmp, ox, oy) {
  bmp.rect(ox, oy, TILE, TILE, PALETTE.eauFoncee);
  // Vaguelettes horizontales decalees, pour lire l'eau au premier coup d'oeil.
  for (let y = 2; y < TILE; y += 4) {
    const decalage = (y / 4) % 2 === 0 ? 1 : 8;
    bmp.rect(ox + decalage, oy + y, 6, 1, PALETTE.eauClaire);
  }
}

function tuileRocher(bmp, ox, oy) {
  bmp.rect(ox, oy, TILE, TILE, PALETTE.rocherFonce);
  bmp.rect(ox + 1, oy + 1, TILE - 2, TILE - 3, PALETTE.rocherClair);
  bmp.rect(ox + 3, oy + 3, 4, 3, PALETTE.rocherFonce);
  bmp.rect(ox + 9, oy + 7, 4, 4, PALETTE.rocherFonce);
  bmp.strokeRect(ox, oy, TILE, TILE, PALETTE.contour);
}

function tuileArbre(bmp, ox, oy) {
  bmp.rect(ox, oy, TILE, TILE, PALETTE.herbeFoncee);
  // Tronc
  bmp.rect(ox + 7, oy + 10, 2, 5, PALETTE.cheveux);
  // Feuillage
  bmp.rect(ox + 3, oy + 2, 10, 8, PALETTE.arbreClair);
  bmp.rect(ox + 2, oy + 4, 12, 5, PALETTE.arbreClair);
  bmp.rect(ox + 4, oy + 7, 8, 3, PALETTE.arbreFonce);
  bmp.rect(ox + 5, oy + 3, 3, 2, PALETTE.arbreFonce);
}

function tuileSolVaisseau(bmp, ox, oy) {
  bmp.rect(ox, oy, TILE, TILE, PALETTE.metalClair);
  // Joints de dalles : marquent la grille sans bruiter le decor.
  bmp.rect(ox, oy, TILE, 1, PALETTE.metalFonce);
  bmp.rect(ox, oy, 1, TILE, PALETTE.metalFonce);
  bmp.set(ox + TILE - 2, oy + TILE - 2, PALETTE.metalFonce);
  bmp.set(ox + 2, oy + 2, PALETTE.metalMur);
}

function tuileMurVaisseau(bmp, ox, oy) {
  bmp.rect(ox, oy, TILE, TILE, PALETTE.metalMur);
  bmp.rect(ox, oy, TILE, 3, PALETTE.metalFonce);
  bmp.rect(ox, oy + TILE - 2, TILE, 2, PALETTE.metalFonce);
  // Bandeau lumineux : repere l'interieur du vaisseau d'un coup d'oeil.
  bmp.rect(ox + 3, oy + 6, TILE - 6, 2, PALETTE.accent);
  bmp.strokeRect(ox, oy, TILE, TILE, PALETTE.contour);
}

function genererPlancheTuiles() {
  const random = createRandom(20260827);
  const bmp = new Bitmap(TILE * TILE_DEFINITIONS.length, TILE);

  TILE_DEFINITIONS.forEach((definition, index) => {
    definition.dessine(bmp, index * TILE, 0, random);
  });

  return bmp;
}

// ---------------------------------------------------------------------------
// Personnage
// ---------------------------------------------------------------------------

/** Directions, dans l'ordre des lignes de la planche. */
const DIRECTIONS = ['bas', 'gauche', 'droite', 'haut'];

/** Nombre d'images par direction : repos, pas gauche, pas droit. */
const FRAMES_PAR_DIRECTION = 3;

/**
 * Dessine une image du personnage.
 *
 * Le personnage fait 16x24 : plus haut qu'une tuile, pour qu'il se detache du
 * sol et que sa tete depasse legerement du decor qu'il longe.
 */
function dessinerPersonnage(bmp, ox, oy, direction, frame) {
  // Cycle de marche a trois images : repos, pas gauche, pas droit.
  // Le buste se souleve d'un pixel sur les images de pas pendant que les pieds
  // restent au sol : c'est ce leger rebond qui rend la marche lisible a 16 pixels.
  const rebond = frame === 0 ? 0 : -1;
  const jambeAvant = frame === 1 ? 'gauche' : frame === 2 ? 'droite' : null;

  const hautCorps = oy + rebond;

  // --- Tete ---
  bmp.rect(ox + 4, hautCorps + 2, 8, 8, PALETTE.peau);
  bmp.strokeRect(ox + 4, hautCorps + 2, 8, 8, PALETTE.contour);

  // --- Cheveux ---
  // De profil, la chevelure couvre l'arriere du crane : a l'oppose du regard.
  if (direction === 'haut') {
    bmp.rect(ox + 5, hautCorps + 3, 6, 5, PALETTE.cheveux); // vu de dos : nuque entiere
  } else {
    bmp.rect(ox + 5, hautCorps + 3, 6, 2, PALETTE.cheveux);
    if (direction === 'gauche') bmp.rect(ox + 9, hautCorps + 3, 2, 4, PALETTE.cheveux);
    if (direction === 'droite') bmp.rect(ox + 5, hautCorps + 3, 2, 4, PALETTE.cheveux);
  }

  // --- Yeux et nez ---
  if (direction === 'bas') {
    bmp.set(ox + 6, hautCorps + 6, PALETTE.contour);
    bmp.set(ox + 9, hautCorps + 6, PALETTE.contour);
  } else if (direction === 'gauche') {
    bmp.set(ox + 6, hautCorps + 6, PALETTE.contour);
    bmp.rect(ox + 4, hautCorps + 7, 1, 2, PALETTE.peauOmbre);
  } else if (direction === 'droite') {
    bmp.set(ox + 9, hautCorps + 6, PALETTE.contour);
    bmp.rect(ox + 11, hautCorps + 7, 1, 2, PALETTE.peauOmbre);
  }

  // --- Buste ---
  bmp.rect(ox + 4, hautCorps + 10, 8, 8, PALETTE.tunique);
  bmp.rect(ox + 4, hautCorps + 16, 8, 2, PALETTE.tuniqueOmbre);
  bmp.strokeRect(ox + 4, hautCorps + 10, 8, 8, PALETTE.contour);

  // --- Bras ---
  if (direction === 'gauche') {
    bmp.rect(ox + 3, hautCorps + 11, 2, 5, PALETTE.tuniqueOmbre);
  } else if (direction === 'droite') {
    bmp.rect(ox + 11, hautCorps + 11, 2, 5, PALETTE.tuniqueOmbre);
  } else {
    bmp.rect(ox + 3, hautCorps + 11, 1, 5, PALETTE.tuniqueOmbre);
    bmp.rect(ox + 12, hautCorps + 11, 1, 5, PALETTE.tuniqueOmbre);
  }

  // --- Jambes et pieds ---
  // La jambe qui avance s'ecarte d'un pixel vers l'exterieur, l'autre reste sous
  // le corps : l'ecartement se voit mieux qu'un simple changement de longueur.
  dessinerJambe(bmp, ox + (jambeAvant === 'gauche' ? 4 : 5), hautCorps + 18, oy);
  dessinerJambe(bmp, ox + (jambeAvant === 'droite' ? 10 : 9), hautCorps + 18, oy);
}

/**
 * Dessine une jambe depuis le bas du buste jusqu'au sol.
 *
 * @param hautJambe Ordonnee du haut de la jambe, qui suit le rebond du buste.
 * @param solY      Ordonnee de reference de l'image, qui elle ne rebondit pas :
 *                  le pied reste ainsi pose au sol quel que soit le rebond.
 */
function dessinerJambe(bmp, x, hautJambe, solY) {
  const piedY = solY + 22;
  bmp.rect(x, hautJambe, 2, piedY - hautJambe, PALETTE.pantalon);
  bmp.rect(x - 1, piedY, 3, 1, PALETTE.cheveux);
}

function genererPlanchePersonnage() {
  const bmp = new Bitmap(CHAR_W * FRAMES_PAR_DIRECTION, CHAR_H * DIRECTIONS.length);

  DIRECTIONS.forEach((direction, ligne) => {
    for (let frame = 0; frame < FRAMES_PAR_DIRECTION; frame += 1) {
      dessinerPersonnage(bmp, frame * CHAR_W, ligne * CHAR_H, direction, frame);
    }
  });

  return bmp;
}


// ---------------------------------------------------------------------------
// Icone de l'application
// ---------------------------------------------------------------------------

const ICONE_TAILLE = 64;

/**
 * Icone du jeu : un sablier, motif central du voyage dans le temps.
 *
 * Sert d'icone d'onglet et d'icone sur l'ecran d'accueil quand le jeu est
 * ajoute depuis le navigateur mobile.
 */
function genererIcone() {
  const bmp = new Bitmap(ICONE_TAILLE, ICONE_TAILLE);
  bmp.rect(0, 0, ICONE_TAILLE, ICONE_TAILLE, [11, 13, 23]);

  const HAUT_AMPOULE = 14;
  const TAILLE_AMPOULE = 18; // hauteur de chacune des deux ampoules
  const LARGEUR_MAX = 34;
  const centre = ICONE_TAILLE / 2;

  // Montants haut et bas du sablier.
  bmp.rect(centre - 20, 8, 40, 4, PALETTE.accent);
  bmp.rect(centre - 20, ICONE_TAILLE - 12, 40, 4, PALETTE.accent);

  // Ampoule superieure : le verre se resserre vers le col.
  for (let i = 0; i < TAILLE_AMPOULE; i += 1) {
    const largeur = Math.round(LARGEUR_MAX - (LARGEUR_MAX - 2) * (i / (TAILLE_AMPOULE - 1)));
    const y = HAUT_AMPOULE + i;
    bmp.rect(centre - Math.floor(largeur / 2), y, largeur, 1, PALETTE.accent);
    // Le sable restant occupe le tiers superieur de l'ampoule.
    if (i < TAILLE_AMPOULE / 3) {
      bmp.rect(centre - Math.floor(largeur / 2) + 2, y, Math.max(largeur - 4, 1), 1, PALETTE.sableClair);
    }
  }

  // Ampoule inferieure : miroir de la precedente.
  for (let i = 0; i < TAILLE_AMPOULE; i += 1) {
    const largeur = Math.round(2 + (LARGEUR_MAX - 2) * (i / (TAILLE_AMPOULE - 1)));
    const y = HAUT_AMPOULE + TAILLE_AMPOULE + i;
    bmp.rect(centre - Math.floor(largeur / 2), y, largeur, 1, PALETTE.accent);
    // Le sable ecoule s'accumule au fond.
    if (i > (TAILLE_AMPOULE * 2) / 3) {
      bmp.rect(centre - Math.floor(largeur / 2) + 2, y, Math.max(largeur - 4, 1), 1, PALETTE.sableClair);
    }
  }

  // Filet de sable qui traverse le col.
  bmp.rect(centre - 1, HAUT_AMPOULE + 6, 1, TAILLE_AMPOULE * 2 - 12, PALETTE.sableFonce);

  return bmp;
}

// ---------------------------------------------------------------------------
// Ecriture
// ---------------------------------------------------------------------------

function ecrire(cheminRelatif, bitmap) {
  const chemin = resolve(ROOT, cheminRelatif);
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, bitmap.toPNG());
  console.log(`  ${cheminRelatif}  (${bitmap.width}x${bitmap.height})`);
}

console.log('Generation des assets temporaires :');
ecrire('public/assets/tilesets/placeholder_terrain.png', genererPlancheTuiles());
ecrire('public/assets/sprites/placeholder_heros.png', genererPlanchePersonnage());
ecrire('public/icone.png', genererIcone());
console.log('Termine.');

console.log('\nOrdre des tuiles :');
TILE_DEFINITIONS.forEach((definition, index) => {
  console.log(`  ${index} - ${definition.nom}`);
});
