/**
 * Resolution virtuelle du jeu.
 *
 * Le jeu est dessine dans une petite resolution en pixels, puis agrandi pour
 * remplir l'ecran du telephone. Fixer cette resolution est la toute premiere
 * decision a prendre : elle determine la taille de chaque asset, le champ de
 * vision du joueur, et la place disponible pour l'interface.
 *
 * Choix retenu :
 *   - largeur FIXE de 20 tuiles, pour qu'un personnage occupe exactement la
 *     meme proportion d'ecran sur tous les telephones ;
 *   - hauteur VARIABLE, calculee depuis le format reel de l'ecran, pour
 *     exploiter toute la hauteur d'un telephone allonge sans bandes noires.
 */

/** Cote d'une tuile, en pixels. Toute la grille du jeu en decoule. */
export const TILE_SIZE = 16;

/** Nombre de tuiles visibles horizontalement. Constante sur tous les appareils. */
export const VIEWPORT_TILES_X = 20;

/** Largeur de la resolution virtuelle, en pixels. */
export const GAME_WIDTH = TILE_SIZE * VIEWPORT_TILES_X; // 320

/**
 * Bornes de la hauteur virtuelle, en tuiles.
 *
 * En dessous du minimum, un ecran presque carre montrerait si peu de hauteur
 * que l'interface mangerait la zone de jeu. Au dessus du maximum, un ecran tres
 * allonge montrerait tant de terrain que les cartes paraitraient minuscules.
 * Hors de ces bornes, le jeu est simplement centre avec de fines bandes.
 */
const MIN_VIEWPORT_TILES_Y = 30; // 480 px - formats trapus (4:3, tablettes)
const MAX_VIEWPORT_TILES_Y = 46; // 736 px - formats tres allonges (20:9 et plus)

export const MIN_GAME_HEIGHT = TILE_SIZE * MIN_VIEWPORT_TILES_Y;
export const MAX_GAME_HEIGHT = TILE_SIZE * MAX_VIEWPORT_TILES_Y;

/**
 * Calcule la hauteur virtuelle a adopter pour un ecran donne.
 *
 * @param windowWidth  Largeur de la fenetre, en pixels ecran.
 * @param windowHeight Hauteur de la fenetre, en pixels ecran.
 * @returns Hauteur virtuelle en pixels de jeu, paire et bornee.
 */
export function computeGameHeight(windowWidth: number, windowHeight: number): number {
  // Une fenetre de dimension nulle arrive au tout premier rendu sur certains
  // navigateurs mobiles : on retombe sur un format 16:9 plutot que de diviser par zero.
  if (windowWidth <= 0 || windowHeight <= 0) {
    return clamp(Math.round(GAME_WIDTH * (16 / 9)), MIN_GAME_HEIGHT, MAX_GAME_HEIGHT);
  }

  const aspectRatio = windowHeight / windowWidth;
  const idealHeight = GAME_WIDTH * aspectRatio;
  const bounded = clamp(idealHeight, MIN_GAME_HEIGHT, MAX_GAME_HEIGHT);

  // Hauteur paire : une hauteur impaire place le centre de la camera sur un
  // demi-pixel, ce qui fait vibrer le pixel art d'une image a l'autre.
  return Math.round(bounded / 2) * 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
