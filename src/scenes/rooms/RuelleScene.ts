import Phaser from 'phaser';
import { LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { FACADE_OPAQUE_ROWS, FEET_Y, IMAGES, LAYER_DEPTH, type RuelleImage, ruelle, S, SKY_COLOR, WORLD_WIDTH } from '@/data/rooms/ruelle';
import { RoomScene } from './RoomScene';

// Bords des facades qui chevauchent la section voisine : leurs pixels transparents restent transparents.
const EDGE = 30;

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
    const made: string[] = [];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const key of [...IMAGES.map((i) => i.key), ...made]) if (this.textures.exists(key)) this.textures.remove(key);
    });

    // Arrondi au pixel d'ecran, identique pour le debut et la fin de chaque image : les recouvrements du
    // manifeste (facades, batiments) et la contiguite du sol sont conserves exactement.
    const snap = (v: number) => Math.round(v * S * RENDER_SCALE) / RENDER_SCALE;
    for (const img of IMAGES) {
      const left = snap(img.x);
      const key = img.layer === 'facades' ? this.opaqueBase(img) : img.key;
      if (key !== img.key) made.push(key);
      this.add
        .image(left, snap(img.y), key)
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

  // Copie de la facade dont les FACADE_OPAQUE_ROWS dernieres lignes au-dessus du sol sont rendues opaques
  // (alpha porte a 255 ; les quelques trous internes prennent la couleur du pixel du dessus). La texture d'origine est liberee aussitot.
  private opaqueBase(img: RuelleImage): string {
    const key = `${img.key}:pied-opaque`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(img.key).getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const base = FEET_Y - img.y; // ligne du sol dans l'image
    const y0 = Math.max(0, base - FACADE_OPAQUE_ROWS);
    // Une ligne de plus au-dessus de la bande sert de reference pour combler les rares trous.
    const top = Math.max(0, y0 - 1);
    const band = ctx.getImageData(0, top, src.width, base - top);
    const d = band.data;
    const w = src.width;
    for (let y = y0 - top; y < base - top; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] > 0) d[i + 3] = 255;
        // Trou totalement transparent a l'interieur de la facade (hors bords qui chevauchent la voisine) :
        // couleur du pixel juste au-dessus.
        else if (y > 0 && x >= EDGE && x < w - EDGE && d[i - w * 4 + 3] > 0) {
          d[i] = d[i - w * 4];
          d[i + 1] = d[i - w * 4 + 1];
          d[i + 2] = d[i - w * 4 + 2];
          d[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(band, 0, top);
    this.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.remove(img.key);
    return key;
  }
}
