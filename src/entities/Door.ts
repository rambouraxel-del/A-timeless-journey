import Phaser from 'phaser';
import { DEPTH } from '@/world/Layers';
import { type DoorGeometry, doorTextureKey } from '@/data/rooms/portes';
import { makeGlowTexture, makeMoteTexture } from '@/scenes/rooms/vaisseauEffects';

const WARM = 0xffe2a8;
const OPEN_MS = 520;
const HOLD_MS = 220;
const GLOW_ALPHA = 0.5;
const HALO_ALPHA = 0.22;

export interface DoorOptions {
  // Texture de la porte ouverte (par defaut : la porte ouverte du pack, lumiere dans le passage).
  openKey?: string;
  // Couleur de la lumiere du passage.
  glowColor?: number;
  // Profondeur d'affichage (par defaut : niveau des equipements, le heros passe devant).
  depth?: number;
}

// Porte du decor : fermee au repos ; a l'interaction la version ouverte apparait en fondu (le battant
// s'ouvre vers l'interieur), avec un halo discret et quelques particules.
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
    options: DoorOptions = {},
  ) {
    makeGlowTexture(scene, 'fx-glow', 128);
    makeMoteTexture(scene, 'fx-mote');
    const openKey = options.openKey ?? doorTextureKey('open', mirrored);
    const depth = options.depth ?? DEPTH.interactables;
    const color = options.glowColor ?? WARM;
    for (const key of [doorTextureKey('closed', mirrored), openKey]) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const place = (image: Phaser.GameObjects.Image) =>
      image.setOrigin(0.5, 1).setPosition(geo.x, geo.y).setDisplaySize(geo.width, geo.height);
    place(scene.add.image(0, 0, doorTextureKey('closed', mirrored))).setDepth(depth);
    this.open = place(scene.add.image(0, 0, openKey)).setDepth(depth).setAlpha(0);

    // Le passage est centre sur l'image, decale de dx.
    const px = geo.x + geo.passage.dx;
    const py = geo.y + geo.passage.dy;
    const additive = (w: number, h: number) =>
      scene.add.image(px, py, 'fx-glow').setDisplaySize(w, h).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.01).setAlpha(0);
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
        tint: [color, 0xfff3d0],
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-geo.passage.width / 2, -geo.passage.height / 2, geo.passage.width, geo.passage.height) } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
      })
      .setDepth(depth + 0.02);
  }

  get isOpen(): boolean {
    return this.open.alpha > 0.5;
  }

  // Ouvre la porte, puis appelle onOpened une fois la lumiere installee.
  play(onOpened: () => void): void {
    if (this.opening) return;
    this.opening = true;
    this.scene.tweens.add({ targets: this.open, alpha: 1, duration: OPEN_MS, ease: 'Sine.easeIn' });
    this.scene.tweens.add({ targets: this.glow, alpha: GLOW_ALPHA, duration: OPEN_MS, ease: 'Sine.easeIn' });
    this.scene.tweens.add({ targets: this.halo, alpha: HALO_ALPHA, duration: OPEN_MS + 200, ease: 'Sine.easeOut' });
    this.scene.time.delayedCall(OPEN_MS * 0.4, () => this.sparks.explode(7));
    this.scene.time.delayedCall(OPEN_MS + HOLD_MS, onOpened);
  }

  // Meme ouverture, sous forme de promesse (mise en scene).
  openAsync(): Promise<void> {
    return new Promise((resolve) => this.play(resolve));
  }

  // Etat ouvert immediat (reprise d'une sauvegarde, arrivee par cette porte).
  setOpen(): void {
    this.opening = true;
    this.open.setAlpha(1);
    this.glow.setAlpha(GLOW_ALPHA);
    this.halo.setAlpha(HALO_ALPHA);
  }

  // Fermeture douce (la lumiere s'eteint en meme temps que le battant revient).
  close(duration = 1400): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: [this.glow, this.halo], alpha: 0, duration, ease: 'Sine.easeInOut' });
      this.scene.tweens.add({
        targets: this.open,
        alpha: 0,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.opening = false;
          resolve();
        },
      });
    });
  }
}
