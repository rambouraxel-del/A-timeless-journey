import Phaser from 'phaser';
import { LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { IMAGES, LAYER_DEPTH, ruelle, S, SKY_COLOR, WORLD_WIDTH } from '@/data/rooms/ruelle';
import { RoomScene } from './RoomScene';

// Ruelle du Louvre : 12 images aux coordonnees du manifeste, sur fond bleu. Chaque couche a un facteur de
// defilement unique et un repere commun a toutes ses sections : ciel 0,15 ; batiments lointains 0,65 ; sol et
// facades 1 (collisions et interactions dans le repere du monde). Les images sont chargees a l'entree de la
// scene et liberees a sa sortie pour menager la memoire du telephone.
export class RuelleScene extends RoomScene {
  protected readonly room = ruelle;

  constructor() {
    super(SceneKeys.Ruelle);
  }

  preload(): void {
    for (const img of IMAGES) if (!this.textures.exists(img.key)) this.load.image(img.key, img.url);
  }

  protected buildScenery(): void {
    this.cameras.main.setBackgroundColor(SKY_COLOR);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const img of IMAGES) if (this.textures.exists(img.key)) this.textures.remove(img.key);
    });

    // Arrondi au pixel d'ecran, identique pour le debut et la fin de chaque image : les recouvrements du
    // manifeste (facades, batiments) et la contiguite du sol sont conserves exactement.
    const snap = (v: number) => Math.round(v * S * RENDER_SCALE) / RENDER_SCALE;
    for (const img of IMAGES) {
      const left = snap(img.x);
      this.add
        .image(left, snap(img.y), img.key)
        .setOrigin(0, 0)
        .setDisplaySize(snap(img.x + img.width) - left, snap(img.y + img.height) - snap(img.y))
        .setDepth(LAYER_DEPTH[img.layer])
        .setScrollFactor(img.parallax);
    }

    // Couverture du fond sur toute la course de la camera (largeur de vue en pixels d'asset).
    const view = LOGICAL_WIDTH / S;
    const camMax = WORLD_WIDTH - view;
    for (const layer of Object.keys(LAYER_DEPTH)) {
      const parts = IMAGES.filter((i) => i.layer === layer && i.parallax < 1);
      if (parts.length === 0) continue;
      const start = Math.min(...parts.map((i) => i.x));
      const end = Math.max(...parts.map((i) => i.x + i.width));
      if (start > 0 || end < parts[0].parallax * camMax + view) console.warn(`Ruelle : couverture insuffisante de la couche ${layer}`);
    }
  }
}
