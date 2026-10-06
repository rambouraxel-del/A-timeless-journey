import Phaser from 'phaser';
import { type ItemId, Items, itemKey } from '@/config/Items';
import { GAME_VIEW, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/config/Layout';
import { PointerGuard } from '@/systems/PointerGuard';
import { FRAME_SLICES, resizeNineSlice as resize, uiNineSlice } from './NineSlice';
import { textStyle, UiColors } from './UiStyle';

const CARD = { width: 176, height: 148 };
const ICON_SIZE = 70;
const GLOW_TEXTURE = 'ui-glow';
const DEPTH = 150;
// Durees (ms) : apparition, maintien lisible, disparition. Un appui apres MIN_SKIP ecourte le maintien.
const TIMING = { in: 320, hold: 1700, out: 320, minSkip: 500 };

// Animation « objet obtenu » generique : image de l'objet, nom, halo dore et petites etincelles. Elle s'affiche
// au centre de la scene de jeu, quelques secondes, puis disparait. Utilisation depuis une salle :
// `await this.pickItem('cle')` (RoomScene) ; les objets sont declares dans src/config/Items.ts.
export class ItemPickup {
  private readonly root: Phaser.GameObjects.Container;
  private readonly catcher: Phaser.GameObjects.Zone;
  private readonly card: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly name: Phaser.GameObjects.Text;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly tweenList: Phaser.Tweens.Tween[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;
  private onDone: (() => void) | null = null;
  private shownAt = 0;
  private leaving = false;

  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.textures.exists(GLOW_TEXTURE)) {
      const texture = scene.textures.createCanvas(GLOW_TEXTURE, 128, 128)!;
      const ctx = texture.getContext();
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      texture.refresh();
    }

    const cx = LOGICAL_WIDTH / 2;
    const cy = Math.round(GAME_VIEW.height * 0.46);

    this.catcher = scene.add.zone(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).setOrigin(0).setInteractive();
    this.catcher.on('pointerdown', (p: Phaser.Input.Pointer) => {
      PointerGuard.consume(p);
      if (scene.time.now - this.shownAt >= TIMING.minSkip) this.leave();
    });

    this.frame = uiNineSlice(scene, 'dialogue_frame', FRAME_SLICES).setAlpha(0.96);
    resize(this.frame, CARD.width, CARD.height);
    this.frame.setPosition(-CARD.width / 2, -CARD.height / 2);
    this.glow = scene.add.image(0, -10, GLOW_TEXTURE).setDisplaySize(150, 150).setTint(0xf2c46b).setBlendMode(Phaser.BlendModes.ADD);
    this.icon = scene.add.image(0, -10, '__DEFAULT');
    this.title = scene.add.text(0, -CARD.height / 2 + 20, 'Objet obtenu', textStyle(14, UiColors.gold)).setOrigin(0.5);
    this.name = scene.add.text(0, CARD.height / 2 - 24, '', textStyle(20)).setOrigin(0.5);
    this.card = scene.add.container(cx, cy, [this.frame, this.glow, this.icon, this.title, this.name]);
    this.sparks = scene.add.particles(cx, cy - 10, GLOW_TEXTURE, {
      speed: { min: 40, max: 95 },
      lifespan: { min: 600, max: 1000 },
      scale: { start: 0.07, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfff1c8, 0xf2c46b],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    this.root = scene.add.container(0, 0, [this.catcher, this.card, this.sparks]).setDepth(DEPTH).setVisible(false);
    this.catcher.input!.enabled = false;
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  // Affiche l'objet ; onDone est appele quand l'animation est terminee.
  show(id: ItemId, onDone: () => void): void {
    const key = itemKey(id);
    if (this.isOpen) this.finish();
    this.onDone = onDone;
    this.leaving = false;
    this.shownAt = this.scene.time.now;

    this.name.setText(Items[id].name);
    if (this.scene.textures.exists(key)) {
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.icon.setTexture(key).setVisible(true);
      this.icon.setScale(ICON_SIZE / Math.max(this.icon.width, this.icon.height));
    } else this.icon.setVisible(false);

    this.root.setVisible(true).setAlpha(0);
    this.catcher.input!.enabled = true;
    const iconScale = this.icon.scale;
    this.card.setScale(0.7);
    this.icon.setScale(iconScale * 0.3).setAngle(-14);
    this.glow.setAlpha(0.55).setScale(0.8);

    this.track(this.scene.tweens.add({ targets: this.root, alpha: 1, duration: TIMING.in * 0.6 }));
    this.track(this.scene.tweens.add({ targets: this.card, scale: 1, duration: TIMING.in, ease: 'Back.easeOut' }));
    // Mise en valeur : l'objet « jaillit » (leger depassement), se redresse, puis flotte tres doucement.
    this.track(
      this.scene.tweens.add({
        targets: this.icon,
        scale: iconScale,
        angle: 0,
        duration: TIMING.in + 200,
        delay: 80,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (this.isOpen && !this.leaving)
            this.track(this.scene.tweens.add({ targets: this.icon, y: this.icon.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        },
      }),
    );
    this.track(this.scene.tweens.add({ targets: this.glow, alpha: 0.95, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    this.scene.time.delayedCall(120, () => this.isOpen && this.sparks.explode(12));
    this.timer = this.scene.time.delayedCall(TIMING.in + TIMING.hold, () => this.leave());
  }

  private leave(): void {
    if (!this.isOpen || this.leaving) return;
    this.leaving = true;
    this.timer?.remove(false);
    this.catcher.input!.enabled = false;
    this.track(this.scene.tweens.add({ targets: this.root, alpha: 0, duration: TIMING.out, onComplete: () => this.finish() }));
  }

  private finish(): void {
    this.timer?.remove(false);
    this.timer = null;
    for (const t of this.tweenList.splice(0)) t.remove();
    this.icon.y = -10;
    this.root.setVisible(false);
    this.catcher.input!.enabled = false;
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  private track(tween: Phaser.Tweens.Tween): void {
    this.tweenList.push(tween);
  }
}
