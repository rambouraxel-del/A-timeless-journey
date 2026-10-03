import Phaser from 'phaser';
import { LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { IMAGES, LAYER_DEPTH, roomWidth, ruelle, S, SKY_COLOR } from '@/data/rooms/ruelle';
import { RoomScene } from './RoomScene';

// Ruelle du Louvre : cour finie. Un seul panorama transparent (facade + sol) devant deux plans de fond qui
// defilent plus lentement : batiments lointains (0,65) et ciel (0,15), sur un fond bleu. Le panorama n'est ni
// repete ni recadre ; la camera s'arrete a ses deux extremites (RoomScene : largeur de la salle = panorama).
// Les images sont chargees a l'entree de la scene et liberees a sa sortie (memoire du telephone).
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

    // Arrondi au pixel d'ecran, identique pour le debut et la fin de chaque image (les bandes des batiments se
    // recouvrent exactement comme dans le manifeste).
    const snap = (v: number) => Math.round(v * S * RENDER_SCALE) / RENDER_SCALE;
    for (const img of IMAGES) {
      const left = snap(img.x * img.scale);
      const top = snap(img.y * img.scale);
      this.add
        .image(left, top, img.key)
        .setOrigin(0, 0)
        .setDisplaySize(snap((img.x + img.width) * img.scale) - left, snap((img.y + img.height) * img.scale) - top)
        .setDepth(LAYER_DEPTH[img.layer])
        .setScrollFactor(img.parallax);
    }

    // Couverture des fonds sur toute la course de la camera : en pixels ecran, l'image doit couvrir
    // [0 ; parallaxe x course + largeur de vue] (la course va de 0 a la largeur du panorama moins la vue).
    const camMax = roomWidth - LOGICAL_WIDTH;
    for (const layer of Object.keys(LAYER_DEPTH)) {
      const parts = IMAGES.filter((i) => i.layer === layer && i.parallax < 1);
      if (parts.length === 0) continue;
      const start = Math.min(...parts.map((i) => i.x * i.scale * S));
      const end = Math.max(...parts.map((i) => (i.x + i.width) * i.scale * S));
      if (start > 0 || end < parts[0].parallax * camMax + LOGICAL_WIDTH) console.warn(`Ruelle : couverture insuffisante de la couche ${layer}`);
    }
  }
}
