import Phaser from 'phaser';
import { DEPTH } from '@/world/Layers';
import { type DoorGeometry, doorTextureKey } from '@/data/rooms/portes';
import { makeGlowTexture, makeMoteTexture } from '@/scenes/rooms/vaisseauEffects';

const WARM = 0xffe2a8;
const OPEN_MS = 520;
const HOLD_MS = 220;

// Porte du decor : fermee au repos ; a l'interaction la version ouverte apparait en fondu (le battant
// s'ouvre vers l'interieur et la lumiere du passage masque ce qu'il y a derriere), avec un halo discret
// et quelques particules. Affichee au niveau des equipements : le heros passe devant.
export class Door {
  private readonly open: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private opening = false;

  constructor(
    private readonly scene: Phaser.Scene,
    geo: DoorGeometry,
    mirrored: boolean,
  ) {
    makeGlowTexture(scene, 'fx-glow', 128);
    makeMoteTexture(scene, 'fx-mote');
    for (const state of ['closed', 'open'] as const) scene.textures.get(doorTextureKey(state, mirrored)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const place = (image: Phaser.GameObjects.Image) =>
      image.setOrigin(0.5, 1).setPosition(geo.x, geo.y).setDisplaySize(geo.width, geo.height);
    place(scene.add.image(0, 0, doorTextureKey('closed', mirrored))).setDepth(DEPTH.interactables);
    this.open = place(scene.add.image(0, 0, doorTextureKey('open', mirrored))).setDepth(DEPTH.interactables).setAlpha(0);

    // Le passage est centre sur l'image, decale de dx.
    const px = geo.x + geo.passage.dx;
    const py = geo.y + geo.passage.dy;
    const additive = (w: number, h: number) =>
      scene.add.image(px, py, 'fx-glow').setDisplaySize(w, h).setTint(WARM).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.interactables + 1).setAlpha(0);
    this.glow = additive(geo.passage.width * 1.5, geo.passage.height * 1.1);
    this.halo = additive(geo.passage.width * 3.2, geo.passage.height * 1.5);
    this.sparks = scene.add
      .particles(px, py, 'fx-mote', {
        emitting: false,
        lifespan: { min: 600, max: 1000 },
        speedX: { min: -22, max: 22 },
        speedY: { min: -34, max: -8 },
        scale: { start: 0.5 + geo.k * 0.15, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        tint: [WARM, 0xfff3d0],
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-geo.passage.width / 2, -geo.passage.height / 2, geo.passage.width, geo.passage.height) } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
      })
      .setDepth(DEPTH.interactables + 2);
  }

  // Ouvre la porte, puis appelle onOpened une fois la lumiere installee.
  play(onOpened: () => void): void {
    if (this.opening) return;
    this.opening = true;
    this.scene.tweens.add({ targets: this.open, alpha: 1, duration: OPEN_MS, ease: 'Sine.easeIn' });
    this.scene.tweens.add({ targets: this.glow, alpha: 0.5, duration: OPEN_MS, ease: 'Sine.easeIn' });
    this.scene.tweens.add({ targets: this.halo, alpha: 0.22, duration: OPEN_MS + 200, ease: 'Sine.easeOut' });
    this.scene.time.delayedCall(OPEN_MS * 0.4, () => this.sparks.explode(7));
    this.scene.time.delayedCall(OPEN_MS + HOLD_MS, onOpened);
  }
}
