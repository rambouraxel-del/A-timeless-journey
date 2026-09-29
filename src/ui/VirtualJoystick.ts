import Phaser from 'phaser';
import type { Vec2 } from '@/world/RoomDefinition';

// Joystick fixe : on pose le doigt n'importe ou dans sa zone, le vecteur part du centre du socle.
export class VirtualJoystick {
  readonly value: Vec2 = { x: 0, y: 0 };
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly radius: number,
    area: Phaser.Geom.Rectangle,
  ) {
    this.base = scene.add.circle(x, y, radius, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.35);
    this.thumb = scene.add.circle(x, y, radius * 0.42, 0xffffff, 0.35);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === null && this.base.visible && area.contains(p.x, p.y)) {
        this.pointerId = p.id;
        this.follow(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) this.follow(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) this.reset();
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  setVisible(visible: boolean): void {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
    if (!visible) this.reset();
  }

  private follow(p: Phaser.Input.Pointer): void {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy);
    const k = len > this.radius ? this.radius / len : 1;
    this.thumb.setPosition(this.x + dx * k, this.y + dy * k);
    this.value.x = (dx * k) / this.radius;
    this.value.y = (dy * k) / this.radius;
  }

  private reset(): void {
    this.pointerId = null;
    this.thumb.setPosition(this.x, this.y);
    this.value.x = 0;
    this.value.y = 0;
  }
}
