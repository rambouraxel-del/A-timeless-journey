import Phaser from 'phaser';
import { Assets, UiFont, UiTextureKeys } from '@/config/Assets';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE, UI_DENSITY } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { layers, props, textureKey, textureUrl } from '@/data/rooms/vaisseau';
import { useLogicalCamera } from '@/ui/UiImage';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    useLogicalCamera(this, RENDER_SCALE);
    const bar = this.add.rectangle(LOGICAL_WIDTH / 2 - 100, LOGICAL_HEIGHT / 2, 0, 6, 0xd0d0d8).setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => (bar.width = 200 * v));
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.error('Asset introuvable :', file.src));

    const { hero } = Assets;
    this.load.spritesheet(hero.key, hero.url, { frameWidth: hero.frameWidth, frameHeight: hero.frameHeight });
    for (const key of UiTextureKeys) this.load.image(key, `assets/ui/x${UI_DENSITY}/${key}.png`);
    this.load.font(UiFont.family, UiFont.url);
    // Salle du vaisseau : panneaux et equipements listes dans scene.json.
    for (const item of [...layers, ...props]) this.load.image(textureKey(item.file), textureUrl(item.file));
  }

  create(): void {
    // Interface haute definition : lissage bilineaire (le mode pixel-art serait crenele).
    for (const key of UiTextureKeys) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.scene.start(SceneKeys.Vaisseau);
    this.scene.launch(SceneKeys.UI);
  }
}
