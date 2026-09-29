import Phaser from 'phaser';
import { GAME_VIEW } from '@/config/Layout';
import { Player } from '@/entities/Player';
import { controls } from '@/systems/Controls';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { InteractionSystem } from '@/systems/InteractionSystem';
import { LAYERS, type LayerId, layerWidth } from '@/world/Layers';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { WalkGraph } from '@/world/WalkGraph';

// Endurance (0 a 1) : perte en courant, gain en marchant, gain a l'arret. Par seconde.
const STAMINA_DRAIN_RUN = 0.02;
const STAMINA_REGEN_WALK = 0.05;
const STAMINA_REGEN_IDLE = 0.1;

// Base commune a toutes les salles : couches de profondeur, camera, joueur, interactions.
// Une salle concrete fournit sa definition et, si besoin, dessine ses couches sans image.
export abstract class RoomScene extends Phaser.Scene {
  protected abstract readonly room: RoomDefinition;
  protected player!: Player;
  private interactions!: InteractionSystem;

  create(): void {
    const cam = this.cameras.main;
    cam.setViewport(GAME_VIEW.x, GAME_VIEW.y, GAME_VIEW.width, GAME_VIEW.height);
    cam.setBounds(0, 0, this.room.width, this.room.height);

    for (const layer of LAYERS) {
      const image = this.room.layerImages?.[layer.id];
      const container = this.add.container(0, 0).setDepth(layer.depth).setScrollFactor(layer.scrollFactor);
      if (image) container.add(this.add.image(0, 0, image).setOrigin(0));
      else this.drawLayer(layer.id, container, layerWidth(this.room.width, GAME_VIEW.width, layer.scrollFactor));
    }
    for (const def of this.room.interactables) this.drawInteractable(def);

    this.player = new Player(this, new WalkGraph(this.room.paths), this.room.spawn);
    this.interactions = new InteractionSystem(this, this.room.interactables, this.player);
    cam.startFollow(this.player.sprite, true, 0.15, 0.15);

    EventBus.on(GameEvents.Interact, this.onInteract, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off(GameEvents.Interact, this.onInteract, this));
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const canRun = controls.run && controls.stamina > 0;
    this.player.update(dt, controls.locked ? { x: 0, y: 0 } : controls.move, canRun);
    const rate = this.player.running ? -STAMINA_DRAIN_RUN : this.player.moving ? STAMINA_REGEN_WALK : STAMINA_REGEN_IDLE;
    controls.stamina = Math.min(1, Math.max(0, controls.stamina + rate * dt));
    this.interactions.update();
  }

  // Couche sans image fournie : rien par defaut.
  protected drawLayer(_id: LayerId, _container: Phaser.GameObjects.Container, _width: number): void {}

  protected drawInteractable(_def: InteractableDef): void {}

  // Reaction par defaut : a remplacer par les vrais dialogues / ouvertures / changements de salle.
  protected onInteract(def: InteractableDef): void {
    EventBus.emit(GameEvents.DialogueOpen, [{ speaker: def.label, text: 'Interaction à définir.' }]);
  }
}
