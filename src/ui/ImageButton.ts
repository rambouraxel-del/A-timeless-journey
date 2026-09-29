import Phaser from 'phaser';

// Bouton image a deux etats (repos / enfonce). La zone de toucher est un disque.
export class ImageButton {
  readonly image: Phaser.GameObjects.Image;
  private held = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly idleKey: string,
    private readonly pressedKey: string | null,
    handlers: { onDown?: () => void; onUp?: () => void },
  ) {
    this.image = scene.add.image(x, y, idleKey);
    const r = this.image.width * 0.46;
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
    else this.image.setScale(pressed ? 0.92 : 1);
  }
}
