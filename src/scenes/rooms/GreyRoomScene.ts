import Phaser from 'phaser';
import { GAME_VIEW } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { greyRoom } from '@/data/rooms/greyRoom';
import { DEPTH, type LayerId } from '@/world/Layers';
import type { InteractableDef, PathSegment } from '@/world/RoomDefinition';
import { RoomScene } from './RoomScene';

const H = GAME_VIEW.height;
const C = {
  sky: 0x26262b,
  far: 0x34343a,
  near: 0x414148,
  wall: 0x5c5c65,
  floor: 0x85858f,
  floorEdge: 0xa5a5ae,
  stairs: 0x70707a,
  ladder: 0x9d9da7,
  object: 0xb2b2bb,
  objectEdge: 0xdcdce4,
  foreground: 0x18181c,
};

// Salle grise de test : uniquement des formes geometriques, en attendant les vrais decors.
export class GreyRoomScene extends RoomScene {
  protected readonly room = greyRoom;

  constructor() {
    super(SceneKeys.GreyRoom);
  }

  protected drawLayer(id: LayerId, container: Phaser.GameObjects.Container, width: number): void {
    const g = this.add.graphics();
    container.add(g);
    switch (id) {
      case 'sky':
        g.fillStyle(C.sky).fillRect(0, 0, width, H);
        break;
      case 'far':
        g.fillStyle(C.far);
        for (let x = 20; x < width; x += 90) {
          g.fillRect(x, 50, 26, H - 50);
          g.fillRect(x - 8, 40, 42, 12);
        }
        break;
      case 'near':
        g.fillStyle(C.near);
        for (let i = 0, x = 40; x < width; i++, x += 150) {
          const h = 70 + ((i * 53) % 90);
          g.fillRect(x, H - h, 80, h);
        }
        break;
      case 'main':
        this.drawStructure(g);
        break;
      case 'foreground':
        g.fillStyle(C.foreground, 0.9);
        for (let x = 300; x < width; x += 460) g.fillRect(x, 0, 18, H);
        g.fillRect(0, H - 8, width, 8);
        break;
    }
  }

  private drawStructure(g: Phaser.GameObjects.Graphics): void {
    const W = this.room.width;
    g.fillStyle(C.wall).fillRect(0, 0, 16, H).fillRect(W - 16, 0, 16, H).fillRect(0, 0, W, 8);

    const byKind = (k: PathSegment['kind']) => this.room.paths.filter((p) => p.kind === k);
    for (const s of byKind('stairs')) this.drawStairs(g, s);
    for (const s of byKind('ladder')) this.drawLadder(g, s);
    for (const s of byKind('floor')) {
      const x1 = Math.min(s.from.x, s.to.x);
      const x2 = Math.max(s.from.x, s.to.x);
      const bottom = s.from.y >= H - 120 ? H : s.from.y + 10;
      g.fillStyle(C.floor).fillRect(x1, s.from.y, x2 - x1, bottom - s.from.y);
      g.fillStyle(C.floorEdge).fillRect(x1, s.from.y, x2 - x1, 2);
    }
  }

  private drawStairs(g: Phaser.GameObjects.Graphics, s: PathSegment): void {
    const [low, high] = s.from.y > s.to.y ? [s.from, s.to] : [s.to, s.from];
    const steps = Math.ceil((low.y - high.y) / 10);
    const stepW = (high.x - low.x) / steps;
    g.fillStyle(C.stairs);
    for (let i = 0; i < steps; i++) {
      const x = low.x + stepW * i;
      const y = low.y - ((low.y - high.y) * (i + 1)) / steps;
      g.fillRect(Math.min(x, x + stepW), y, Math.abs(stepW), low.y - y);
    }
  }

  private drawLadder(g: Phaser.GameObjects.Graphics, s: PathSegment): void {
    const top = Math.min(s.from.y, s.to.y) - 26;
    const bottom = Math.max(s.from.y, s.to.y);
    g.fillStyle(C.ladder).fillRect(s.from.x - 10, top, 3, bottom - top).fillRect(s.from.x + 7, top, 3, bottom - top);
    for (let y = bottom - 8; y > top; y -= 10) g.fillRect(s.from.x - 10, y, 20, 2);
  }

  protected drawInteractable(def: InteractableDef): void {
    const g = this.add.graphics().setDepth(DEPTH.interactables);
    const { x, y, width: w, height: h } = def;
    const left = x - w / 2;
    g.fillStyle(C.object).lineStyle(1, C.objectEdge);
    switch (def.kind) {
      case 'chest':
        g.fillRect(left, y - h, w, h).strokeRect(left, y - h, w, h).lineBetween(left, y - h + 8, left + w, y - h + 8);
        break;
      case 'door':
        g.fillRect(left, y - h, w, h).strokeRect(left, y - h, w, h);
        g.fillStyle(C.objectEdge).fillRect(left + w - 9, y - h / 2, 4, 4);
        break;
      case 'computer':
        g.fillRect(left, y - 12, w, 12).strokeRect(left, y - 12, w, 12);
        g.fillRect(left + 4, y - h, w - 8, h - 14).strokeRect(left + 4, y - h, w - 8, h - 14);
        break;
      case 'character':
        g.fillRect(left, y - h + 14, w, h - 14).strokeRect(left, y - h + 14, w, h - 14);
        g.fillCircle(x, y - h + 7, 7).strokeCircle(x, y - h + 7, 7);
        break;
      case 'object':
        g.fillRect(left, y - h, w, h).strokeRect(left, y - h, w, h);
        break;
    }
    this.add
      .text(x, y + 2, def.label, { fontFamily: 'monospace', fontSize: '7px', color: '#2a2a30' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.interactables);
  }
}
