/**
 * Point d'entree du jeu.
 */

import Phaser from 'phaser';

import { createGameConfig } from '@/config/GameConfig';
import { SCENE, type SceneKey } from '@/config/SceneKeys';
import { BootScene } from '@/scenes/BootScene';
import { DiagnosticScene } from '@/scenes/DiagnosticScene';
import { GameScene } from '@/scenes/GameScene';
import { PreloadScene } from '@/scenes/PreloadScene';

const PARENT = 'game-root';

const parametres = new URLSearchParams(window.location.search);

/**
 * Scene a lancer apres le chargement.
 *
 * `?scene=diagnostic` ouvre l'ecran de controle de la mise en page, utile pour
 * verifier les marges d'interface directement sur un appareil.
 */
const sceneDepart: SceneKey =
  parametres.get('scene') === SCENE.DIAGNOSTIC ? SCENE.DIAGNOSTIC : SCENE.JEU;

/** `?debug=1` affiche les cadres de collision par dessus le decor. */
const debugPhysique = parametres.get('debug') === '1';

/**
 * Retire le message d'echec affiche par defaut dans la page.
 *
 * Ce code ne s'execute que si le module a bien ete charge et que Phaser a pu
 * demarrer : c'est precisement ce qui distingue une page qui fonctionne d'une
 * page dont les fichiers sont introuvables.
 */
function masquerMessageEchec(): void {
  document.getElementById('echec-chargement')?.remove();
}

const game = new Phaser.Game({
  ...createGameConfig(PARENT, debugPhysique),
  scene: [BootScene, PreloadScene, GameScene, DiagnosticScene],
});

game.registry.set('sceneDepart', sceneDepart);
masquerMessageEchec();

// Expose l'instance en developpement, pour pouvoir l'inspecter depuis la console.
if (import.meta.env.DEV) {
  (window as unknown as { jeu: Phaser.Game }).jeu = game;
}
