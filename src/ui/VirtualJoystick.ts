import Phaser from 'phaser';
import { RENDER_SCALE } from '@/config/Layout';
import type { Vec2 } from '@/world/RoomDefinition';
import { uiImage } from './UiImage';

// Joystick fixe : on pose le doigt n'importe ou dans sa zone, le vecteur part du centre du socle.
export class VirtualJoystick {
  readonly value: Vec2 = { x: 0, y: 0 };
  private readonly base: Phaser.GameObjects.Image;
  private readonly thumb: Phaser.GameObjects.Image;
  private readonly travel: number;
  private pointerId: number | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    scale: number,
    area: Phaser.Geom.Rectangle,
  ) {
    this.base = uiImage(scene, 'joystick_base', x, y, scale);
    this.thumb = uiImage(scene, 'joystick_thumb', x, y, scale);
    this.travel = 38 * scale;

    // Les pointeurs arrivent en pixels d'ecran ; le jeu raisonne en pixels logiques.
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === null && this.base.visible && area.contains(p.x / RENDER_SCALE, p.y / RENDER_SCALE)) {
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
    const dx = p.x / RENDER_SCALE - this.x;
    const dy = p.y / RENDER_SCALE - this.y;
    const len = Math.hypot(dx, dy);
    const k = len > this.travel ? this.travel / len : 1;
    this.thumb.setPosition(this.x + dx * k, this.y + dy * k);
    this.value.x = (dx * k) / this.travel;
    this.value.y = (dy * k) / this.travel;
  }

  private reset(): void {
    this.pointerId = null;
    this.thumb.setPosition(this.x, this.y);
    this.value.x = 0;
    this.value.y = 0;
  }
}
