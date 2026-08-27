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

  cheveux: [74, 59, 42],
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
ecrire('public/icone.png', genererIcone());
console.log('Termine.');

console.log('\nOrdre des tuiles :');
TILE_DEFINITIONS.forEach((definition, index) => {
  console.log(`  ${index} - ${definition.nom}`);
});
