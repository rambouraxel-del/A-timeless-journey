import Phaser from 'phaser';
import { LOGICAL_WIDTH } from '@/config/Layout';
import { ARTWORKS, artworkCenterX, groundY, GUIDED_STEPS, npcDefs, npcKey, npcScale, npcSprite, S } from '@/data/rooms/musee';
import { EXTRA_SPOTS, GROUP_ZONE, NPCS, type NpcSpec, PROFESSOR_LINES, SPOT_MIN_X, SPOT_SPACING } from '@/data/rooms/musee-pnj';
import { gameState } from '@/systems/GameState';
import type { DialogueLine } from '@/systems/Dialogue';

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
}

// Ambiance du musee : cours devant l'etape active, visiteurs et agents.
export class MuseeCrowd {
  private readonly npcs: Npc[];
  private readonly byId = new Map<string, Npc>();

  constructor(
    scene: Phaser.Scene,
    private readonly onMoved: (id: string) => void,
  ) {
    this.npcs = NPCS.map((spec) => new Npc(scene, spec));
    for (const n of this.npcs) this.byId.set(n.spec.id, n);
    this.placeGroup(true);
    // Visiteurs : points d'arret distincts ; agents : premier point de leur ronde.
    for (const n of this.npcs) {
      if (n.spec.role === 'visiteur') this.moveToFreeSpot(n, false);
      if (n.spec.role === 'agent') {
        n.place(n.spec.patrol![0] * S, groundY);
        n.face(Math.random() < 0.5 ? 1 : -1);
      }
      n.nextAt = scene.time.now + 1500 + Math.random() * 7500; // decales : pas de comportements synchronises
    }
  }

  get sprites(): Phaser.GameObjects.Image[] {
    return this.npcs.map((n) => n.sprite);
  }

  // Replique d'un personnage interactif (le professeur commente l'oeuvre qu'il presente).
  linesFor(id: string): DialogueLine[] | null {
    const npc = this.byId.get(id);
    if (!npc) return null;
    if (npc.spec.role === 'professeur') {
      const step = gameState.visit.step;
      const text = step < GUIDED_STEPS.length ? PROFESSOR_LINES[GUIDED_STEPS[step]] : PROFESSOR_LINES.fin;
      return [{ speaker: 'Professeur', text }];
    }
    return npc.spec.lines ?? null;
  }

  // Le personnage se tourne vers le heros qui lui parle.
  faceToward(id: string, x: number): void {
    const npc = this.byId.get(id);
    if (npc) npc.face(x < npc.x ? -1 : 1);
  }

  // Groupe devant l'etape active (devant le Sacre une fois la visite terminee). Appele pendant que
  // l'oeuvre ouverte masque la salle : les autres personnages libèrent la place sans que l'on voie rien.
  placeGroup(initial = false): void {
    const target = GUIDED_STEPS[Math.min(gameState.visit.step, GUIDED_STEPS.length - 1)];
    const cx = artworkCenterX(target);
    for (const n of this.npcs) {
      const g = n.spec.group;
      if (!g) continue;
      n.place(cx + (g.dx + GROUP_SHIFT) * S, groundY + g.dy * S);
      n.face(g.face);
      if (!initial) this.onMoved(n.spec.id);
    }
    for (const n of this.npcs) {
      if (n.spec.group) continue;
      if (Math.abs(n.x - cx) < GROUP_ZONE * S && (n.spec.role === 'visiteur' || n.spec.role === 'agent')) {
        if (n.spec.role === 'visiteur') this.moveToFreeSpot(n, false);
        else n.place(n.spec.patrol![n.patrolIndex] * S, groundY);
        if (!initial) this.onMoved(n.spec.id);
      }
    }
  }

  update(time: number, cameraX: number): void {
    for (const n of this.npcs) {
      if (time < n.nextAt) continue;
      n.nextAt = time + 4500 + Math.random() * 7500;
      const role = n.spec.role;
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
      const patrol = n.spec.patrol!;
      const next = (n.patrolIndex + 1) % patrol.length;
      if (!this.offscreen(patrol[next] * S, cameraX) || this.occupied(patrol[next] * S, n)) return;
      n.patrolIndex = next;
      n.place(patrol[next] * S, groundY);
      n.face(Math.random() < 0.5 ? 1 : -1);
    } else {
      this.moveToFreeSpot(n, true, cameraX);
    }
    this.onMoved(n.spec.id);
  }

  private moveToFreeSpot(n: Npc, needOffscreen: boolean, cameraX = 0): void {
    const target = GUIDED_STEPS[Math.min(gameState.visit.step, GUIDED_STEPS.length - 1)];
    const groupX = artworkCenterX(target);
    const spots = [...ARTWORKS.flatMap((a) => [artworkCenterX(a.id) / S - 70, artworkCenterX(a.id) / S + 70]), ...EXTRA_SPOTS]
      .filter((x) => x >= SPOT_MIN_X)
      .sort(() => Math.random() - 0.5);
    for (const sx of spots) {
      const x = (sx + (Math.random() - 0.5) * 24) * S;
      if (Math.abs(x - groupX) < GROUP_ZONE * S || this.occupied(x, n)) continue;
      if (needOffscreen && !this.offscreen(x, cameraX)) continue;
      n.place(x, groundY + Math.random() * 10 * S);
      // Devant un tableau : regard tourne vers lui.
      const nearest = ARTWORKS.map((a) => artworkCenterX(a.id)).sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
      n.face(Math.abs(nearest - x) < 130 * S ? (nearest > x ? 1 : -1) : Math.random() < 0.5 ? 1 : -1);
      return;
    }
  }

  private occupied(x: number, self: Npc): boolean {
    return this.npcs.some((o) => o !== self && Math.abs(o.x - x) < SPOT_SPACING * S);
  }
}
