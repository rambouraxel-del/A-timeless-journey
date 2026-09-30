import Phaser from 'phaser';
import { RENDER_SCALE } from '@/config/Layout';
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

const GOLD_CSS = '#f2c46b';
// Contour : 1 pixel logique de trait, lueur exterieure de quelques pixels logiques.
const LINE = 1;
const GLOW = 5;

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
  private readonly halo: Phaser.GameObjects.Image;
  private readonly outlineKeys = new Map<string, string>();
  private readonly bounds = new Map<string, Bounds>();
  private selected: InteractableDef | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
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
    // Au-dessus des equipements, sous le heros ; l'image change selon l'objet selectionne.
    this.halo = scene.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.interactables + 2).setVisible(false);
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

  // Contour dore fin + legere lueur exterieure, epousant la silhouette reelle de l'objet.
  private drawHalo(): void {
    const def = this.selected;
    if (!def) return;
    const outline = this.outlineFor(def);
    this.halo
      .setTexture(outline.key)
      .setDisplaySize(outline.width / RENDER_SCALE, outline.height / RENDER_SCALE)
      .setOrigin(outline.originX, outline.originY)
      .setPosition(def.x, def.y)
      .setAlpha(1);
  }

  // Cree (une fois par objet) l'image du contour a la resolution de l'ecran : masque de la silhouette
  // (transparence du sprite), dilate d'un trait, puis lueur douce ; l'interieur est evide.
  private outlineFor(def: InteractableDef): { key: string; width: number; height: number; originX: number; originY: number } {
    const key = this.outlineKeys.get(def.id) ?? `outline:${def.id}`;
    const line = Math.max(1, Math.round(LINE * RENDER_SCALE));
    const pad = (GLOW + LINE + 1) * RENDER_SCALE;
    const mw = Math.max(1, Math.round(def.width * RENDER_SCALE));
    const mh = Math.max(1, Math.round(def.height * RENDER_SCALE));
    const width = mw + pad * 2;
    const height = mh + pad * 2;
    const info = { key, width, height, originX: (pad + mw / 2) / width, originY: (pad + mh) / height };
    if (this.outlineKeys.has(def.id)) return info;

    // 1. Masque binaire de la silhouette, dessine a la taille ecran.
    const mask = document.createElement('canvas');
    mask.width = mw;
    mask.height = mh;
    const mctx = mask.getContext('2d', { willReadFrequently: true })!;
    if (def.textureKey && this.scene.textures.exists(def.textureKey)) {
      mctx.imageSmoothingEnabled = true;
      mctx.drawImage(this.scene.textures.get(def.textureKey).getSourceImage() as HTMLImageElement, 0, 0, mw, mh);
      const img = mctx.getImageData(0, 0, mw, mh);
      for (let i = 0; i < img.data.length; i += 4) {
        const on = img.data[i + 3] > 110;
        img.data[i] = 242;
        img.data[i + 1] = 196;
        img.data[i + 2] = 107;
        img.data[i + 3] = on ? 255 : 0;
      }
      mctx.putImageData(img, 0, 0);
    } else {
      mctx.fillStyle = GOLD_CSS;
      mctx.fillRect(0, 0, mw, mh);
    }

    // 2. Silhouette dilatee (trait) avec lueur exterieure, puis interieur retire.
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d')!;
    ctx.shadowColor = 'rgba(242, 196, 107, 0.4)';
    ctx.shadowBlur = GLOW * RENDER_SCALE;
    for (let dx = -line; dx <= line; dx += line) {
      for (let dy = -line; dy <= line; dy += line) ctx.drawImage(mask, pad + dx, pad + dy);
    }
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(mask, pad, pad);

    const texture = this.scene.textures.addCanvas(key, out);
    texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.outlineKeys.set(def.id, key);
    return info;
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
