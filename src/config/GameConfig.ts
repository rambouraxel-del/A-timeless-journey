/**
 * Assemblage de la configuration Phaser.
 */

import Phaser from 'phaser';

import { GAME_WIDTH, computeGameHeight } from './Resolution';

/** Couleur de fond, visible dans les bandes si l'ecran ne correspond pas au format. */
export const COULEUR_FOND = '#0b0d17';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  const gameHeight = computeGameHeight(window.innerWidth, window.innerHeight);

  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: COULEUR_FOND,

    // Indispensable pour du pixel art : desactive le lissage a l'agrandissement
    // et aligne le rendu sur des pixels entiers.
    pixelArt: true,
    roundPixels: true,

    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: gameHeight,
    },

    physics: {
      default: 'arcade',
      arcade: {
        // Vue de dessus : aucune gravite.
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },

    input: {
      // Le joystick et un bouton d'action peuvent etre presses simultanement.
      activePointers: 3,
    },

    render: {
      antialias: false,
    },
  };
}
