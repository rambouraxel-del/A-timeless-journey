import Phaser from 'phaser';
import { LOGICAL_WIDTH } from '@/config/Layout';
import { ARTWORKS, artworkCenterX, groundY, GUIDED_STEPS, musee, MYSTERIOUS, npcDefs, npcKey, npcScale, npcSprite, S } from '@/data/rooms/musee';
import { EXTRA_SPOTS, GROUP_ZONE, NPCS, type NpcSpec, SPOT_MIN_X, SPOT_SPACING } from '@/data/rooms/musee-pnj';
import { gameState } from '@/systems/GameState';

// Les sprites fournis sont immobiles : aucun glissement ni rebond. Les personnages ne changent de place
// que hors de la vue de la camera ; a l'ecran, ils s'arretent, se retournent et regardent a gauche ou a droite.
const OFFSCREEN_MARGIN = 80;
// Le groupe est centre sur le tableau presente (les decalages du fichier de donnees sont relatifs a ce centre + GROUP_SHIFT).
const GROUP_SHIFT = 110;

// Profondeur d'affichage selon la position des pieds : plus bas a l'ecran = plus devant. Le heros
// (pieds sur la ligne de sol) sert de repere.
export const depthForFeet = (feetY: number): number => 46 + (feetY / S - groundY / S) * 0.25;

class Npc {
  readonly sprite: Phaser.GameObjects.Image;
  feetY = groundY;
  nextAt = 0;
  patrolIndex = 0;

  constructor(
    scene: Phaser.Scene,
    readonly spec: NpcSpec,
  ) {
    const info = npcSprite(spec);
    this.sprite = scene.add.image(0, 0, npcKey(spec)).setOrigin(0.5, info.feetY / info.size).setScale(npcScale(spec));
  }

  get inGroup(): boolean {
    return this.spec.role === 'professeur' || this.spec.role === 'etudiant';
  }

  get x(): number {
    return this.sprite.x;
  }

  place(x: number, feetY: number): void {
    this.feetY = feetY;
    this.sprite.setPosition(x, feetY).setDepth(depthForFeet(feetY));
    const def = npcDefs.get(this.spec.id);
    if (def) {
      const info = npcSprite(this.spec);
      def.x = x;
      def.y = feetY + (info.size - info.feetY) * npcScale(this.spec);
      def.depth = this.sprite.depth;
    }
  }

  // dir : 1 vers la droite (orientation des images), -1 vers la gauche (image retournee).
  face(dir: -1 | 1): void {
    this.sprite.setFlipX(dir < 0);
    const def = npcDefs.get(this.spec.id);
    if (def) def.flipX = dir < 0;
  }

  get facing(): -1 | 1 {
    return this.sprite.flipX ? -1 : 1;
  }

  // Retire le personnage de la salle (image cachee, zone d'interaction hors d'atteinte).
  remove(): void {
    this.sprite.setVisible(false);
    const def = npcDefs.get(this.spec.id);
    if (def) def.x = -100000;
  }
}

// Ambiance du musee : cours devant l'etape active, visiteurs et agents.
export class MuseeCrowd {
  private readonly npcs: Npc[];
  private readonly byId = new Map<string, Npc>();

  constructor(
    scene: Phaser.Scene,
    private readonly onMoved: (id: string) => void,
  ) {
    this.npcs = NPCS.filter((spec) => spec.id !== MYSTERIOUS.placeholderOf).map((spec) => new Npc(scene, spec));
    for (const n of this.npcs) this.byId.set(n.spec.id, n);
    this.placeGroup(true);
    // Visiteurs : points d'arret distincts ; agents : un point de leur ronde, hors de la zone du groupe.
    for (const n of this.npcs) {
      if (n.spec.role === 'visiteur') this.moveToFreeSpot(n, false);
      if (n.spec.role === 'agent') this.moveToPatrolPoint(n, false, 0);
      n.nextAt = scene.time.now + 1500 + Math.random() * 7500; // decales : pas de comportements synchronises
    }
  }

  // Centre de la zone occupee par le groupe (null : le groupe est parti).
  private groupCenter(): number | null {
    const story = gameState.story;
    if (story.groupLeft) return null;
    if (!story.introDone) return musee.spawn.x;
    return artworkCenterX(GUIDED_STEPS[Math.min(gameState.visit.step, GUIDED_STEPS.length - 1)]);
  }

  npc(id: string): { x: number; face: (dir: -1 | 1) => void } | undefined {
    return this.byId.get(id);
  }

  // Identifiant du dialogue d'ambiance d'un personnage (null : pas de replique).
  dialogueFor(id: string): string | null {
    return this.byId.get(id)?.spec.dialogue ?? null;
  }

  // Le groupe quitte la salle : tous se tournent vers l'entree, puis s'effacent l'un apres l'autre (les sprites
  // sont immobiles : pas de fausse marche).
  leave(scene: Phaser.Scene): Promise<void> {
    const group = this.npcs.filter((n) => n.inGroup).sort((a, b) => a.x - b.x);
    for (const n of group) n.face(-1);
    return new Promise((resolve) => {
      group.forEach((n, i) => {
        scene.tweens.add({ targets: n.sprite, alpha: 0, duration: 420, delay: 500 + i * 140, ease: 'Sine.easeIn' });
      });
      scene.time.delayedCall(500 + group.length * 140 + 450, () => {
        for (const n of group) {
          n.remove();
          this.onMoved(n.spec.id);
        }
        resolve();
      });
    });
  }

  get sprites(): Phaser.GameObjects.Image[] {
    return this.npcs.map((n) => n.sprite);
  }

  // Le personnage se tourne vers le heros qui lui parle.
  faceToward(id: string, x: number): void {
    const npc = this.byId.get(id);
    if (npc) npc.face(x < npc.x ? -1 : 1);
  }

  // Groupe devant l'etape active (devant le Sacre une fois la visite terminee). Appele pendant que
  // l'oeuvre ouverte masque la salle : les autres personnages libèrent la place sans que l'on voie rien.
  // A l'entree avant la visite, devant le tableau de l'etape ensuite ; absent une fois parti.
  placeGroup(initial = false): void {
    const cx = this.groupCenter();
    if (cx === null) {
      for (const n of this.npcs) if (n.inGroup) n.remove();
      return;
    }
    const atEntrance = !gameState.story.introDone;
    for (const n of this.npcs) {
      const g = atEntrance ? n.spec.entrance : n.spec.group;
      if (!g) continue;
      n.place(cx + (g.dx + (atEntrance ? 0 : GROUP_SHIFT)) * S, groundY + g.dy * S);
      n.face(g.face);
      if (!initial) this.onMoved(n.spec.id);
    }
    for (const n of this.npcs) {
      if (n.inGroup) continue;
      if (Math.abs(n.x - cx) < GROUP_ZONE * S) {
        if (n.spec.role === 'visiteur') this.moveToFreeSpot(n, false);
        else this.moveToPatrolPoint(n, false, 0);
        if (!initial) this.onMoved(n.spec.id);
      }
    }
  }

  // Agent : premier point de sa ronde libre et hors de la zone du groupe (en partant du point suivant).
  private moveToPatrolPoint(n: Npc, needOffscreen: boolean, cameraX: number): boolean {
    const patrol = n.spec.patrol!;
    const cx = this.groupCenter();
    for (let k = 1; k <= patrol.length; k++) {
      const i = (n.patrolIndex + k) % patrol.length;
      const x = patrol[i] * S;
      if (cx !== null && Math.abs(x - cx) < GROUP_ZONE * S) continue;
      if (this.occupied(x, n) || (needOffscreen && !this.offscreen(x, cameraX))) continue;
      n.patrolIndex = i;
      n.place(x, groundY);
      n.face(Math.random() < 0.5 ? 1 : -1);
      return true;
    }
    return false;
  }

  update(time: number, cameraX: number): void {
    for (const n of this.npcs) {
      if (time < n.nextAt) continue;
      n.nextAt = time + 4500 + Math.random() * 7500;
      const role = n.spec.role;
      if (!n.sprite.visible) continue;
      if (role === 'professeur') {
        // Parle aux etudiants, puis se tourne parfois vers le tableau.
        n.face(Math.random() < 0.65 ? -1 : 1);
      } else if (role === 'etudiant') {
        if (Math.random() < 0.3) n.face(Math.random() < 0.65 ? 1 : -1);
      } else if (this.offscreen(n.x, cameraX) && Math.random() < 0.6) {
        this.relocate(n, cameraX);
      } else if (Math.random() < 0.7) {
        n.face(n.facing === 1 ? -1 : 1); // regarde autour de lui
      }
    }
  }

  private offscreen(x: number, cameraX: number): boolean {
    return x < cameraX - OFFSCREEN_MARGIN || x > cameraX + LOGICAL_WIDTH + OFFSCREEN_MARGIN;
  }

  // Changement de place, jamais sous les yeux du joueur : l'ancienne et la nouvelle place sont hors de la vue.
  private relocate(n: Npc, cameraX: number): void {
    if (n.spec.role === 'agent') {
      if (!this.moveToPatrolPoint(n, true, cameraX)) return;
    } else {
      this.moveToFreeSpot(n, true, cameraX);
    }
    this.onMoved(n.spec.id);
  }

  private moveToFreeSpot(n: Npc, needOffscreen: boolean, cameraX = 0): void {
    const groupX = this.groupCenter();
    const spots = [...ARTWORKS.flatMap((a) => [artworkCenterX(a.id) / S - 70, artworkCenterX(a.id) / S + 70]), ...EXTRA_SPOTS]
      .filter((x) => x >= SPOT_MIN_X)
      .sort(() => Math.random() - 0.5);
    for (const sx of spots) {
      const x = (sx + (Math.random() - 0.5) * 24) * S;
      if ((groupX !== null && Math.abs(x - groupX) < GROUP_ZONE * S) || this.occupied(x, n)) continue;
      if (needOffscreen && !this.offscreen(x, cameraX)) continue;
      n.place(x, groundY + Math.random() * 10 * S);
      // Devant un tableau : regard tourne vers lui.
      const nearest = ARTWORKS.map((a) => artworkCenterX(a.id)).sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
      n.face(Math.abs(nearest - x) < 130 * S ? (nearest > x ? 1 : -1) : Math.random() < 0.5 ? 1 : -1);
      return;
    }
  }

  private occupied(x: number, self: Npc): boolean {
    return this.npcs.some((o) => o !== self && o.sprite.visible && Math.abs(o.x - x) < SPOT_SPACING * S);
  }
}
