/**
 * Chargement des assets, avec barre de progression.
 *
 * La scene parcourt le manifeste declare dans config/Assets : aucun chemin de
 * fichier n'est ecrit en dur ici.
 */

import Phaser from 'phaser';

import { SPRITESHEETS, TILESETS, assetUrl } from '@/config/Assets';
import { GAME_WIDTH } from '@/config/Resolution';
import { SCENE } from '@/config/SceneKeys';
import { registerAnimations } from '@/systems/Animations';

const COULEUR_BARRE = 0x6bd6c4;
const COULEUR_CADRE = 0x565f7a;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE.PRELOAD);
  }

  preload(): void {
    this.creerBarreDeProgression();

    for (const tileset of Object.values(TILESETS)) {
      this.load.spritesheet(tileset.key, assetUrl(tileset.path), {
        frameWidth: tileset.frameWidth,
        frameHeight: tileset.frameHeight,
      });
    }

    for (const spritesheet of Object.values(SPRITESHEETS)) {
      this.load.spritesheet(spritesheet.key, assetUrl(spritesheet.path), {
        frameWidth: spritesheet.frameWidth,
        frameHeight: spritesheet.frameHeight,
      });
    }
  }

  create(): void {
    registerAnimations(this.anims);
    this.scene.start(SCENE.DIAGNOSTIC);
  }

  private creerBarreDeProgression(): void {
    const largeurCadre = GAME_WIDTH / 2;
    const hauteurCadre = 8;
    const x = (GAME_WIDTH - largeurCadre) / 2;
    const y = Number(this.game.config.height) / 2 - hauteurCadre / 2;

    const cadre = this.add.graphics();
    cadre.lineStyle(1, COULEUR_CADRE, 1);
    cadre.strokeRect(x - 0.5, y - 0.5, largeurCadre + 1, hauteurCadre + 1);

    const barre = this.add.graphics();

    this.load.on(Phaser.Loader.Events.PROGRESS, (progression: number) => {
      barre.clear();
      barre.fillStyle(COULEUR_BARRE, 1);
      barre.fillRect(x, y, Math.floor(largeurCadre * progression), hauteurCadre);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      barre.destroy();
      cadre.destroy();
    });
  }
}
