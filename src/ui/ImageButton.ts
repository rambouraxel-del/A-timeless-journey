import Phaser from 'phaser';
import type { UiKey } from '@/config/UiSizes.generated';
import { uiImage } from './UiImage';

// Bouton image a deux etats (repos / enfonce). La zone de toucher est un disque.
export class ImageButton {
  readonly image: Phaser.GameObjects.Image;
  private readonly baseScale: number;
  private held = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly idleKey: UiKey,
    private readonly pressedKey: UiKey | null,
    scale: number,
    handlers: { onDown?: () => void; onUp?: () => void },
  ) {
    this.image = uiImage(scene, idleKey, x, y, scale);
    this.baseScale = this.image.scale;
    const r = this.image.width * 0.48;
    this.image.setInteractive(new Phaser.Geom.Circle(this.image.width / 2, this.image.height / 2, r), Phaser.Geom.Circle.Contains);
    this.image.on('pointerdown', () => {
      this.setPressed(true);
      handlers.onDown?.();
    });
    const release = () => {
      if (!this.held) return;
      this.setPressed(false);
      handlers.onUp?.();
    };
    this.image.on('pointerup', release);
    this.image.on('pointerout', release);
  }

  private setPressed(pressed: boolean): void {
    this.held = pressed;
    if (this.pressedKey) this.image.setTexture(pressed ? this.pressedKey : this.idleKey);
    else this.image.setScale(this.baseScale * (pressed ? 0.94 : 1));
  }
}
