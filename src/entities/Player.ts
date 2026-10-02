import Phaser from 'phaser';
import { Assets, HeroFrames } from '@/config/Assets';
import { HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import { DEPTH } from '@/world/Layers';
import type { Vec2 } from '@/world/RoomDefinition';
import type { WalkGraph } from '@/world/WalkGraph';

const WALK_SPEED = 80;
const CLIMB_SPEED = 55;
const RUN_MULTIPLIER = 1.2; // vitesse de deplacement (la course a sa propre animation)
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
  private interacting = false;

  // Direction du regard : -1 (gauche) ou 1 (droite).
  get facingDirection(): -1 | 1 {
    return this.facing === 'left' ? -1 : 1;
  }
  // Vrai si le joueur s'est deplace en courant pendant la derniere mise a jour.
  running = false;
  // Vrai si le joueur s'est deplace (marche ou course) pendant la derniere mise a jour.
  moving = false;

  constructor(
    scene: Phaser.Scene,
    private readonly graph: WalkGraph,
    spawn: Vec2,
    heroScale = 1,
  ) {
    ({ edge: this.edge, s: this.s } = graph.closest(spawn));
    createHeroAnimations(scene);
    this.sprite = scene.add
      .sprite(0, 0, Assets.hero.key)
      .setOrigin(0.5, Assets.hero.feetY / Assets.hero.frameHeight)
      .setScale((HERO_PIXEL_SCALE * heroScale) / RENDER_SCALE)
      .setDepth(DEPTH.player);
    this.syncSprite();
    this.sprite.play('hero-breathe-right');
  }

  // Tourne le heros (reprise de sauvegarde).
  setFacing(direction: -1 | 1): void {
    this.facing = direction < 0 ? 'left' : 'right';
    this.sprite.play(`hero-breathe-${this.facing}`);
  }

  // Animation d'interaction (ouverture d'une porte), jouee une fois vers la direction donnee ; le
  // heros reprend ensuite sa respiration.
  interact(direction: -1 | 1): void {
    this.facing = direction < 0 ? 'left' : 'right';
    this.interacting = true;
    this.sprite.anims.timeScale = 1;
    this.sprite.play(`hero-interact-${this.facing}`);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.interacting = false;
      this.sprite.play(`hero-breathe-${this.facing}`);
    });
  }

  get position(): Vec2 {
    return this.graph.pointOn(this.edge, this.s);
  }

  // walkFactor : ralentissement (essoufflement) de la vitesse et de l'animation.
  update(dt: number, input: Vec2, run = false, walkFactor = 1): void {
    this.running = false;
    this.moving = false;
    if (this.interacting) return;
    const magnitude = Math.min(1, Math.hypot(input.x, input.y));
    if (magnitude < DEAD_ZONE) {
      this.sprite.anims.timeScale = 1;
      this.animate(false, 0);
      return;
    }
    const want = { x: input.x / Math.hypot(input.x, input.y), y: input.y / Math.hypot(input.x, input.y) };
    // Le heros se tourne vers la direction visee, meme s'il ne peut pas avancer (mur, arret).
    if (Math.abs(want.x) >= 0.5) this.facing = want.x < 0 ? 'left' : 'right';
    const edges = this.graph.edges;
    const speedFactor = (run ? RUN_MULTIPLIER : 1) * walkFactor;
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
    this.sprite.anims.timeScale = walkFactor;
    this.syncSprite();
    this.animate(moved, moveX, this.running);
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

  private animate(moved: boolean, moveX: number, run = false): void {
    // Pas d'animation d'escalade fournie : sur une echelle, le heros garde son animation de
    // marche tant qu'il monte ou descend, et reprend la pose de repos a l'arret.
    if (Math.abs(moveX) > 0.01) this.facing = moveX < 0 ? 'left' : 'right';
    this.sprite.play(`hero-${moved ? (run ? 'run' : 'walk') : 'breathe'}-${this.facing}`, true);
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
  // Respiration a l'arret ; course (cadence plus rapide que la marche) ; interaction jouee une fois.
  scene.anims.create({ key: 'hero-breathe-left', frames: frames(HeroFrames.breatheLeft), frameRate: 3, repeat: -1 });
  scene.anims.create({ key: 'hero-breathe-right', frames: frames(HeroFrames.breatheRight), frameRate: 3, repeat: -1 });
  scene.anims.create({ key: 'hero-run-left', frames: frames(HeroFrames.runLeft), frameRate: 13.5, repeat: -1 });
  scene.anims.create({ key: 'hero-run-right', frames: frames(HeroFrames.runRight), frameRate: 13.5, repeat: -1 });
  scene.anims.create({ key: 'hero-interact-left', frames: frames(HeroFrames.interactLeft), frameRate: 10, repeat: 0 });
  scene.anims.create({ key: 'hero-interact-right', frames: frames(HeroFrames.interactRight), frameRate: 10, repeat: 0 });
  scene.anims.create({ key: 'hero-idle-left', frames: frames(HeroFrames.idleLeft), frameRate: 1, repeat: -1 });
  scene.anims.create({ key: 'hero-idle-right', frames: frames(HeroFrames.idleRight), frameRate: 1, repeat: -1 });
}
