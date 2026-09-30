import Phaser from 'phaser';
import type { Player } from '@/entities/Player';
import { DEPTH } from '@/world/Layers';
import type { InteractableDef } from '@/world/RoomDefinition';
import { controls } from './Controls';
import { EventBus, GameEvents } from './EventBus';

// Distance max (en px, bord de l'objet -> pieds du joueur) pour pouvoir interagir.
const REACH_X = 28;
const REACH_Y = 24;
// Un objet est "devant" le heros si son centre est de son cote du regard, au-dela de cette marge.
const FRONT_MARGIN = 4;

const GOLD = 0xf2c46b;

interface Bounds {
  x: number; // centre
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Partie visible d'un objet (pixels non transparents), en coordonnees du monde. Les images du decor
// ont des marges transparentes : le halo et la zone de toucher doivent suivre l'objet, pas l'image.
function visibleBounds(scene: Phaser.Scene, def: InteractableDef): Bounds {
  const fallback = { x: def.x, left: def.x - def.width / 2, top: def.y - def.height, right: def.x + def.width / 2, bottom: def.y };
  if (!def.textureKey || !scene.textures.exists(def.textureKey)) return fallback;
  const image = scene.textures.get(def.textureKey).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let x0 = canvas.width;
  let y0 = canvas.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return fallback;
  const k = def.width / image.width; // pixels du monde par pixel de texture
  const left = def.x + (x0 - image.width / 2) * k;
  const right = def.x + (x1 + 1 - image.width / 2) * k;
  return { x: (left + right) / 2, left, right, top: def.y - (image.height - y0) * k, bottom: def.y - (image.height - (y1 + 1)) * k };
}

// Rend les objets d'une salle cliquables. Un seul objet a portee est selectionne a la fois,
// entoure d'un halo dore ; le bouton INTERAGIR agit uniquement sur lui.
export class InteractionSystem {
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly bounds = new Map<string, Bounds>();
  private selected: InteractableDef | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly defs: InteractableDef[],
    private readonly player: Player,
  ) {
    for (const def of defs) {
      const b = visibleBounds(scene, def);
      this.bounds.set(def.id, b);
      scene.add
        .zone(b.x, (b.top + b.bottom) / 2, b.right - b.left + 12, b.bottom - b.top + 12)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tryInteract(def));
    }
    // Au-dessus des equipements, sous le heros.
    this.halo = scene.add.graphics().setDepth(DEPTH.interactables + 2).setVisible(false);
    scene.tweens.add({ targets: this.halo, alpha: { from: 0.7, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    EventBus.on(GameEvents.InteractRequest, this.onRequest);
  }

  // Bouton INTERAGIR : uniquement l'objet entoure du halo.
  private readonly onRequest = () => {
    if (controls.locked) return;
    if (this.selected) EventBus.emit(GameEvents.Interact, this.selected);
    else EventBus.emit(GameEvents.Hint, 'Rien à portée.');
  };

  destroy(): void {
    EventBus.off(GameEvents.InteractRequest, this.onRequest);
  }

  update(): void {
    const next = controls.locked ? null : this.pickTarget();
    if (next !== this.selected) {
      this.selected = next;
      this.drawHalo();
    }
    this.halo.setVisible(this.selected !== null);
  }

  // Parmi les objets a portee : celui qui est devant le heros (le plus proche d'abord) ;
  // si aucun n'est devant, le plus proche tout court.
  private pickTarget(): InteractableDef | null {
    const p = this.player.position;
    const dir = this.player.facingDirection;
    const inReach = this.defs.filter((d) => this.inReach(d));
    if (inReach.length === 0) return null;

    const distance = (d: InteractableDef) => Math.max(0, Math.abs(this.bounds.get(d.id)!.x - p.x) - (this.bounds.get(d.id)!.right - this.bounds.get(d.id)!.left) / 2);
    const closest = (list: InteractableDef[]) =>
      list.sort((a, b) => distance(a) - distance(b) || Math.abs(this.bounds.get(a.id)!.x - p.x) - Math.abs(this.bounds.get(b.id)!.x - p.x))[0];

    const ahead = inReach.filter((d) => (this.bounds.get(d.id)!.x - p.x) * dir > FRONT_MARGIN);
    return closest(ahead.length > 0 ? ahead : inReach);
  }

  // Halo pixel-art : contour a coins coupes (trait vif + deux traits plus doux) et leger voile dore.
  private drawHalo(): void {
    const g = this.halo.clear();
    const def = this.selected;
    if (!def) return;
    const b = this.bounds.get(def.id)!;
    const rect = (grow: number) => ({ x0: b.left - grow, y0: b.top - grow, x1: b.right + grow, y1: b.bottom + grow });
    const path = (r: { x0: number; y0: number; x1: number; y1: number }, c: number) => {
      g.beginPath();
      g.moveTo(r.x0 + c, r.y0);
      g.lineTo(r.x1 - c, r.y0);
      g.lineTo(r.x1, r.y0 + c);
      g.lineTo(r.x1, r.y1 - c);
      g.lineTo(r.x1 - c, r.y1);
      g.lineTo(r.x0 + c, r.y1);
      g.lineTo(r.x0, r.y1 - c);
      g.lineTo(r.x0, r.y0 + c);
      g.closePath();
    };
    g.fillStyle(GOLD, 0.07);
    path(rect(2), 4);
    g.fillPath();
    const rings = [
      { grow: 7, width: 4, alpha: 0.16, c: 6 },
      { grow: 4.5, width: 3, alpha: 0.34, c: 5 },
      { grow: 2, width: 2, alpha: 1, c: 4 },
    ];
    for (const ring of rings) {
      g.lineStyle(ring.width, GOLD, ring.alpha);
      path(rect(ring.grow), ring.c);
      g.strokePath();
    }
  }

  private tryInteract(def: InteractableDef): void {
    if (controls.locked) return;
    if (this.inReach(def)) EventBus.emit(GameEvents.Interact, def);
    else EventBus.emit(GameEvents.Hint, 'Trop loin : approche-toi.');
  }

  private inReach(def: InteractableDef): boolean {
    const p = this.player.position;
    const reachX = def.reachX ?? def.width / 2 + REACH_X;
    return Math.abs(p.x - def.x) <= reachX && Math.abs(p.y - (def.standY ?? def.y)) <= REACH_Y;
  }
}
