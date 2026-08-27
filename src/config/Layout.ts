/**
 * Zones sures de l'interface, en pixels de jeu.
 *
 * En portrait sur telephone, deux contraintes physiques dictent la mise en page :
 * le haut de l'ecran est mange par l'encoche et la barre d'etat, et le bas est
 * occupe par le pouce du joueur. Ce module centralise ces reservations pour que
 * jamais une information utile ne se retrouve sous un doigt ou sous une encoche.
 *
 * Toutes les valeurs sont exprimees dans la resolution virtuelle du jeu.
 */

import { GAME_WIDTH, TILE_SIZE } from './Resolution';

/**
 * Marge haute reservee a l'encoche et a la barre d'etat du systeme.
 *
 * Valeur fixe volontaire : avec le mode d'ajustement retenu, le canvas couvre
 * presque exactement l'ecran, et 24 pixels de jeu representent environ 75 pixels
 * ecran sur un telephone allonge - de quoi degager les encoches courantes.
 */
export const SAFE_MARGIN_TOP = TILE_SIZE + TILE_SIZE / 2; // 24

/** Marge basse reservee a la barre de navigation gestuelle du systeme. */
export const SAFE_MARGIN_BOTTOM = TILE_SIZE + TILE_SIZE / 2; // 24

/** Hauteur de la barre d'etat du jeu (vie, epoque courante, bouton carte). */
export const HUD_HEIGHT = TILE_SIZE * 2; // 32

/** Hauteur de la bande basse ou vivent le joystick et les boutons d'action. */
export const CONTROLS_HEIGHT = TILE_SIZE * 7; // 112

/** Rayon de la zone tactile du joystick. */
export const JOYSTICK_RADIUS = TILE_SIZE * 2.5; // 40

/** Rayon du bouton d'action principal. */
export const ACTION_BUTTON_RADIUS = TILE_SIZE * 1.75; // 28

/** Un rectangle de l'interface, en pixels de jeu. */
export interface Zone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Un point de l'interface, en pixels de jeu. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Ensemble des reperes de mise en page pour une hauteur d'ecran donnee. */
export interface LayoutZones {
  /** Barre d'etat, en haut, sous l'encoche. */
  readonly hud: Zone;
  /** Bande basse reservee aux commandes tactiles. */
  readonly controls: Zone;
  /** Bande centrale garantie libre de toute interface. */
  readonly safePlayArea: Zone;
  /** Centre au repos du joystick digital. */
  readonly joystickAnchor: Point;
  /** Centre du bouton d'action principal. */
  readonly actionButtonAnchor: Point;
}

/**
 * Calcule les zones d'interface pour une hauteur de jeu donnee.
 *
 * @param gameHeight Hauteur de la resolution virtuelle, en pixels de jeu.
 */
export function computeLayout(gameHeight: number): LayoutZones {
  const hud: Zone = {
    x: 0,
    y: SAFE_MARGIN_TOP,
    width: GAME_WIDTH,
    height: HUD_HEIGHT,
  };

  const controlsTop = gameHeight - SAFE_MARGIN_BOTTOM - CONTROLS_HEIGHT;
  const controls: Zone = {
    x: 0,
    y: controlsTop,
    width: GAME_WIDTH,
    height: CONTROLS_HEIGHT,
  };

  const safeTop = hud.y + hud.height;
  const safePlayArea: Zone = {
    x: 0,
    y: safeTop,
    width: GAME_WIDTH,
    height: controlsTop - safeTop,
  };

  // Le joystick se pose a gauche, le bouton d'action a droite, tous deux
  // verticalement centres dans la bande des commandes.
  const controlsCenterY = controls.y + controls.height / 2;

  return {
    hud,
    controls,
    safePlayArea,
    joystickAnchor: {
      x: TILE_SIZE * 4, // 64
      y: controlsCenterY,
    },
    actionButtonAnchor: {
      x: GAME_WIDTH - TILE_SIZE * 3.5, // 264
      y: controlsCenterY,
    },
  };
}
