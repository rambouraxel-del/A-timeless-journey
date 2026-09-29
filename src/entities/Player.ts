import Phaser from 'phaser';
import { Assets, HeroFrames } from '@/config/Assets';
import { HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import { DEPTH } from '@/world/Layers';
import type { Vec2 } from '@/world/RoomDefinition';
import type { WalkGraph } from '@/world/WalkGraph';

const WALK_SPEED = 80;
const CLIMB_SPEED = 55;
const RUN_MULTIPLIER = 1.5; // vitesse de deplacement ET d'animation
const DEAD_ZONE = 0.2;
// Alignement minimal entre le joystick et un chemin pour l'emprunter.
const MIN_ALIGN = 0.35;
// Si le joueur pousse vers une echelle/un escalier tout proche, il s'y recale tout seul.
const ASSIST_DISTANCE = 16;
const EPS = 0.01;

type Facing = 'left' | 'right';

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private edge: number;
  private s: number;
  private facing: Facing = 'right';
  // Vrai si le joueur s'est deplace en courant pendant la derniere mise a jour.
  running = false;
  // Vrai si le joueur s'est deplace (marche ou course) pendant la derniere mise a jour.
  moving = false;

  constructor(
    scene: Phaser.Scene,
    private readonly graph: WalkGraph,
    spawn: Vec2,
  ) {
    ({ edge: this.edge, s: this.s } = graph.closest(spawn));
    createHeroAnimations(scene);
    this.sprite = scene.add
      .sprite(0, 0, Assets.hero.key)
      .setOrigin(0.5, Assets.hero.feetY / Assets.hero.frameHeight)
      .setScale(HERO_PIXEL_SCALE / RENDER_SCALE)
      .setDepth(DEPTH.player);
    this.syncSprite();
    this.sprite.play('hero-idle-right');
  }

  get position(): Vec2 {
    return this.graph.pointOn(this.edge, this.s);
  }

  update(dt: number, input: Vec2, run = false): void {
    this.running = false;
    this.moving = false;
    const magnitude = Math.min(1, Math.hypot(input.x, input.y));
    if (magnitude < DEAD_ZONE) {
      this.sprite.anims.timeScale = 1;
      this.animate(false, 0);
      return;
    }
    const want = { x: input.x / Math.hypot(input.x, input.y), y: input.y / Math.hypot(input.x, input.y) };
    const edges = this.graph.edges;
    const speedFactor = run ? RUN_MULTIPLIER : 1;
    let budget = (edges[this.edge].kind === 'ladder' ? CLIMB_SPEED : WALK_SPEED) * speedFactor * magnitude * dt;
    let moved = false;
    let moveX = 0;

    for (let i = 0; i < 4 && budget > 0; i++) {
      const e = edges[this.edge];
      const node = this.s <= EPS ? e.a : this.s >= e.length - EPS ? e.b : -1;
      let sign: number;
      if (node >= 0) {
        const exit = this.bestExit(node, want);
        if (!exit) break;
        this.edge = exit.edge;
        this.s = node === edges[exit.edge].a ? 0 : edges[exit.edge].length;
        sign = exit.sign;
      } else {
        const align = dot(want, e.dir);
        sign = Math.abs(align) >= MIN_ALIGN ? Math.sign(align) : this.assistSign(want);
        if (sign === 0) break;
      }
      const cur = edges[this.edge];
      const step = Math.min(budget, sign > 0 ? cur.length - this.s : this.s);
      if (step <= 0) break;
      this.s += sign * step;
      budget -= step;
      moved = true;
      moveX = cur.dir.x * sign;
    }

    this.moving = moved;
    this.running = run && moved;
    this.sprite.anims.timeScale = speedFactor;
    this.syncSprite();
    this.animate(moved, moveX);
  }

  private bestExit(node: number, want: Vec2): { edge: number; sign: number } | null {
    let best: { edge: number; sign: number; align: number } | null = null;
    for (const index of this.graph.edgesAt(node)) {
      const e = this.graph.edges[index];
      const sign = node === e.a ? 1 : -1;
      const align = dot(want, { x: e.dir.x * sign, y: e.dir.y * sign });
      if (align >= MIN_ALIGN && (!best || align > best.align)) best = { edge: index, sign, align };
    }
    return best;
  }

  private assistSign(want: Vec2): number {
    const e = this.graph.edges[this.edge];
    const ends = [
      { node: e.a, sign: -1, dist: this.s },
      { node: e.b, sign: 1, dist: e.length - this.s },
    ];
    for (const end of ends) {
      if (end.dist > ASSIST_DISTANCE) continue;
      for (const index of this.graph.edgesAt(end.node)) {
        if (index === this.edge) continue;
        const other = this.graph.edges[index];
        const sign = end.node === other.a ? 1 : -1;
        if (dot(want, { x: other.dir.x * sign, y: other.dir.y * sign }) >= 0.7) return end.sign;
      }
    }
    return 0;
  }

  private syncSprite(): void {
    const p = this.position;
    this.sprite.setPosition(p.x, p.y);
  }

  private animate(moved: boolean, moveX: number): void {
    // Pas d'animation d'escalade fournie : sur une echelle, le heros garde son animation de
    // marche tant qu'il monte ou descend, et reprend la pose de repos a l'arret.
    if (Math.abs(moveX) > 0.01) this.facing = moveX < 0 ? 'left' : 'right';
    this.sprite.play(`hero-${moved ? 'walk' : 'idle'}-${this.facing}`, true);
  }
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function createHeroAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('hero-idle-right')) return;
  const key = Assets.hero.key;
  const frames = (range: { start: number; end: number }) => scene.anims.generateFrameNumbers(key, range);
  scene.anims.create({ key: 'hero-walk-left', frames: frames(HeroFrames.walkLeft), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: 'hero-walk-right', frames: frames(HeroFrames.walkRight), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: 'hero-idle-left', frames: frames(HeroFrames.idleLeft), frameRate: 1, repeat: -1 });
  scene.anims.create({ key: 'hero-idle-right', frames: frames(HeroFrames.idleRight), frameRate: 1, repeat: -1 });
}
