/**
 * Premiere scene lancee.
 *
 * Elle ne charge rien : son seul role est de preparer ce qui doit exister avant
 * meme l'ecran de chargement, puis de ceder la main.
 */

import Phaser from 'phaser';

import { SCENE } from '@/config/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }

  create(): void {
    this.scene.start(SCENE.PRELOAD);
  }
}
