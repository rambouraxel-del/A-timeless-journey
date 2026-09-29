import Phaser from 'phaser';
import { uiImage } from './UiImage';

// Positions internes mesurees sur les cadres (largeur logique 86).
const HEART_X = [19, 34, 48, 63];
const HEART_Y = 12;
const ENERGY = { x: 30, y: 9, width: 41, height: 6 };

// Haut gauche : embleme temporel, coeurs de vie, jauge d'energie.
export class Hud {
  private readonly hearts: Phaser.GameObjects.Image[];
  private readonly energyFill: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHealth: number) {
    const frameX = x + 42;
    const hearts = uiImage(scene, 'hud_hearts_frame', frameX, y + 6).setOrigin(0);
    const energy = uiImage(scene, 'hud_energy_frame', frameX, hearts.y + hearts.displayHeight + 1).setOrigin(0);
    this.hearts = HEART_X.slice(0, maxHealth).map((hx) => uiImage(scene, 'hud_heart_full', hearts.x + hx, hearts.y + HEART_Y));
    this.energyFill = uiImage(scene, 'hud_energy_fill', energy.x + ENERGY.x, energy.y + ENERGY.y).setOrigin(0);
    this.energyFill.setDisplaySize(ENERGY.width, ENERGY.height);
    uiImage(scene, 'hud_emblem', x, y).setOrigin(0);
  }

  update(health: number, stamina: number): void {
    this.hearts.forEach((h, i) => h.setTexture(i < health ? 'hud_heart_full' : 'hud_heart_empty'));
    const width = ENERGY.width * Phaser.Math.Clamp(stamina, 0, 1);
    this.energyFill.setVisible(width > 0.5).setDisplaySize(Math.max(0.5, width), ENERGY.height);
  }
}
