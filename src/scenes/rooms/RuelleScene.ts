import Phaser from 'phaser';
import { LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { LAYERS, layerKey, PARALLAX, roomWidth, ruelle, S, SECTIONS, WORLD_WIDTH } from '@/data/rooms/ruelle';
import { RoomScene } from './RoomScene';

interface Placed {
  image: Phaser.GameObjects.Image;
  baseX: number;
}

// Ruelle du Louvre : quatre sections assemblees de gauche a droite, quatre couches chacune, aux
// positions du manifeste. Facades et sol suivent le monde ; l'arriere-plan et le premier plan ont un
// leger decalage horizontal commun a leurs quatre sections (parallaxe bornee).
export class RuelleScene extends RoomScene {
  protected readonly room = ruelle;
  private background: Placed[] = [];
  private foreground: Placed[] = [];

  constructor() {
    super(SceneKeys.Ruelle);
  }

  protected buildScenery(): void {
    this.background = [];
    this.foreground = [];
    for (const layer of LAYERS) {
      SECTIONS.forEach((section, i) => {
        // Chaque section s'arrete la ou commence la suivante (arrondi au pixel d'ecran), sans raccord visible.
        const left = Math.round(section.x * S * RENDER_SCALE) / RENDER_SCALE;
        const next = i + 1 < SECTIONS.length ? Math.round(SECTIONS[i + 1].x * S * RENDER_SCALE) / RENDER_SCALE : roomWidth;
        const image = this.add
          .image(left, 0, layerKey(section.folder, layer.id))
          .setOrigin(0, 0)
          .setDisplaySize(next - left + (i + 1 < SECTIONS.length ? 1 / RENDER_SCALE : 0), section.height * S)
          .setDepth(layer.depth);
        if (layer.parallax === 'background') this.background.push({ image, baseX: left });
        if (layer.parallax === 'foreground') this.foreground.push({ image, baseX: left });
      });
    }
    this.applyParallax();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.applyParallax();
  }

  // Decalage global : meme valeur pour toutes les sections d'une couche, borne en pixels d'asset.
  private applyParallax(): void {
    const centerAsset = (this.cameras.main.scrollX + LOGICAL_WIDTH / 2) / S;
    const offset = (p: { factor: number; max: number }) =>
      Math.round(Phaser.Math.Clamp((centerAsset - WORLD_WIDTH / 2) * p.factor, -p.max, p.max) * S * RENDER_SCALE) / RENDER_SCALE;
    const bg = offset(PARALLAX.background);
    const fg = offset(PARALLAX.foreground);
    for (const p of this.background) p.image.x = p.baseX + bg;
    for (const p of this.foreground) p.image.x = p.baseX + fg;
  }
}
