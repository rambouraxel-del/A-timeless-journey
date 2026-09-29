import Phaser from 'phaser';
import type { Player } from '@/entities/Player';
import { DEPTH } from '@/world/Layers';
import type { InteractableDef } from '@/world/RoomDefinition';
import { uiImage } from '@/ui/UiImage';
import { controls } from './Controls';
import { EventBus, GameEvents } from './EventBus';

// Distance max (en px, bord de l'objet -> pieds du joueur) pour pouvoir interagir.
const REACH_X = 28;
const REACH_Y = 24;

// Rend les objets d'une salle cliquables et signale ceux qui sont a portee.
export class InteractionSystem {
  private readonly markers = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    scene: Phaser.Scene,
    private readonly defs: InteractableDef[],
    private readonly player: Player,
  ) {
    for (const def of defs) {
      scene.add
        .zone(def.x, def.y - def.height / 2, def.width + 12, def.height + 12)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tryInteract(def));

      const marker = uiImage(scene, 'marker_interact', def.x, def.y - def.height - 4)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.markers)
        .setVisible(false);
      scene.tweens.add({ targets: marker, y: marker.y - 3, duration: 450, yoyo: true, repeat: -1 });
      this.markers.set(def.id, marker);
    }
    EventBus.on(GameEvents.InteractRequest, this.onRequest);
  }

  // Bouton INTERAGIR : l'objet a portee le plus proche du joueur.
  private readonly onRequest = () => {
    if (controls.locked) return;
    const p = this.player.position;
    const target = this.defs.filter((d) => this.inReach(d)).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (target) EventBus.emit(GameEvents.Interact, target);
    else EventBus.emit(GameEvents.Hint, 'Rien à portée.');
  };

  destroy(): void {
    EventBus.off(GameEvents.InteractRequest, this.onRequest);
  }

  update(): void {
    for (const def of this.defs) this.markers.get(def.id)?.setVisible(this.inReach(def));
  }

  private tryInteract(def: InteractableDef): void {
    if (controls.locked) return;
    if (this.inReach(def)) EventBus.emit(GameEvents.Interact, def);
    else EventBus.emit(GameEvents.Hint, 'Trop loin : approche-toi.');
  }

  private inReach(def: InteractableDef): boolean {
    const p = this.player.position;
    return Math.abs(p.x - def.x) <= def.width / 2 + REACH_X && Math.abs(p.y - def.y) <= REACH_Y;
  }
}
