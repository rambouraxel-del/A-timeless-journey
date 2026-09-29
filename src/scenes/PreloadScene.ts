import Phaser from 'phaser';
import { Assets, UiFont, UiTextures } from '@/config/Assets';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    const bar = this.add.rectangle(SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT / 2, 0, 6, 0xd0d0d8).setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => (bar.width = 200 * v));
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.error('Asset introuvable :', file.src));

    const { hero } = Assets;
    this.load.spritesheet(hero.key, hero.url, { frameWidth: hero.frameWidth, frameHeight: hero.frameHeight });
    for (const key of UiTextures) this.load.image(key, `assets/ui/${key}.png`);
    this.load.font(UiFont.family, UiFont.url);
  }

  create(): void {
    this.scene.start(SceneKeys.GreyRoom);
    this.scene.launch(SceneKeys.UI);
  }
}
