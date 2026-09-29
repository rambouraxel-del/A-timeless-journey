import Phaser from 'phaser';

// Positions internes mesurees sur les cadres decoupes (voir tools/decouper-ui.py).
const HEART_X = [19, 34, 48, 63];
const HEART_Y = 12;
const ENERGY = { x: 30, y: 9, width: 41, height: 6 };

// Haut gauche : embleme temporel, coeurs de vie, jauge d'energie.
export class Hud {
  private readonly hearts: Phaser.GameObjects.Image[];
  private readonly energyFill: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHealth: number) {
    const frameX = x + 42;
    const hearts = scene.add.image(frameX, y + 6, 'hud_hearts_frame').setOrigin(0);
    const energy = scene.add.image(frameX, hearts.y + hearts.height + 1, 'hud_energy_frame').setOrigin(0);
    this.hearts = HEART_X.slice(0, maxHealth).map((hx) => scene.add.image(hearts.x + hx, hearts.y + HEART_Y, 'hud_heart_full'));
    this.energyFill = scene.add
      .image(energy.x + ENERGY.x, energy.y + ENERGY.y, 'hud_energy_fill')
      .setOrigin(0)
      .setDisplaySize(ENERGY.width, ENERGY.height);
    scene.add.image(x, y, 'hud_emblem').setOrigin(0);
  }

  update(health: number, stamina: number): void {
    this.hearts.forEach((h, i) => h.setTexture(i < health ? 'hud_heart_full' : 'hud_heart_empty'));
    const width = Math.round(ENERGY.width * Phaser.Math.Clamp(stamina, 0, 1));
    this.energyFill.setVisible(width > 0).setDisplaySize(Math.max(1, width), ENERGY.height);
  }
}
