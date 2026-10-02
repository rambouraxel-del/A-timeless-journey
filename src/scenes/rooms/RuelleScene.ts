import { LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { HOUSES, layerKey, PARALLAX, roomWidth, ruelle, S, SECTION_LAYERS, SECTIONS, SKY, WORLD_WIDTH } from '@/data/rooms/ruelle';
import { RoomScene } from './RoomScene';

// Ruelle du Louvre : quatre sections assemblees de gauche a droite (facades, sol, premier plan) et, derriere,
// deux plans de fond qui defilent a des vitesses differentes : le ciel (lent) et les maisons / toits lointains.
// Tous les morceaux d'une couche partagent le meme facteur ; collisions et interactions restent dans le monde.
export class RuelleScene extends RoomScene {
  protected readonly room = ruelle;

  constructor() {
    super(SceneKeys.Ruelle);
  }

  protected buildScenery(): void {
    for (const layer of SECTION_LAYERS) {
      SECTIONS.forEach((section, i) => {
        // Chaque section s'arrete la ou commence la suivante (arrondi au pixel d'ecran), sans raccord visible.
        const left = Math.round(section.x * S * RENDER_SCALE) / RENDER_SCALE;
        const next = i + 1 < SECTIONS.length ? Math.round(SECTIONS[i + 1].x * S * RENDER_SCALE) / RENDER_SCALE : roomWidth;
        this.add
          .image(left, 0, layerKey(section.folder, layer.id))
          .setOrigin(0, 0)
          .setDisplaySize(next - left + (i + 1 < SECTIONS.length ? 1 / RENDER_SCALE : 0), section.height * S)
          .setDepth(layer.depth)
          .setScrollFactor(1);
      });
    }

    // Fond : un seul morceau par couche. La largeur visible (en pixels d'asset) depend du telephone ; le facteur des
    // maisons est reduit si besoin pour que l'image couvre toute la course de la camera.
    const view = LOGICAL_WIDTH / S;
    const housesFactor = Math.min(PARALLAX.maisons, (HOUSES.x + HOUSES.width - view) / (WORLD_WIDTH - view));
    const place = (def: { key: string; width: number; height: number; depth: number; x: number }, factor: number) =>
      this.add
        .image(Math.round(def.x * S * RENDER_SCALE) / RENDER_SCALE, 0, def.key)
        .setOrigin(0, 0)
        .setDisplaySize(def.width * S, def.height * S)
        .setDepth(def.depth)
        .setScrollFactor(factor);
    place(SKY, PARALLAX.ciel);
    place(HOUSES, housesFactor);
    if (housesFactor < PARALLAX.maisons) console.warn('Ruelle : facteur des maisons reduit a', housesFactor);
  }
}
