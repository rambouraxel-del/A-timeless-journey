/**
 * Point d'entree du jeu.
 */

import Phaser from 'phaser';

import { createGameConfig } from '@/config/GameConfig';
import { BootScene } from '@/scenes/BootScene';
import { DiagnosticScene } from '@/scenes/DiagnosticScene';
import { PreloadScene } from '@/scenes/PreloadScene';

const PARENT = 'game-root';

const game = new Phaser.Game({
  ...createGameConfig(PARENT),
  scene: [BootScene, PreloadScene, DiagnosticScene],
});

// Expose l'instance en developpement, pour pouvoir l'inspecter depuis la console.
if (import.meta.env.DEV) {
  (window as unknown as { jeu: Phaser.Game }).jeu = game;
}
