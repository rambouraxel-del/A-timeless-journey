import Phaser from 'phaser';
import { GAME_VIEW, LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { Player } from '@/entities/Player';
import { controls } from '@/systems/Controls';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { InteractionSystem } from '@/systems/InteractionSystem';
import { loadGame, saveGame } from '@/systems/SaveGame';
import { LAYERS, type LayerId, layerWidth } from '@/world/Layers';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { WalkGraph } from '@/world/WalkGraph';

// Endurance (0 a 1) : perte en courant, gain en marchant, gain a l'arret. Par seconde.
const STAMINA_DRAIN_RUN = 0.05;
const STAMINA_REGEN_WALK = 0.05;
const STAMINA_REGEN_IDLE = 0.1;

// Base commune a toutes les salles : couches de profondeur, camera, joueur, interactions.
// Une salle concrete fournit sa definition et, si besoin, dessine ses couches sans image.
export abstract class RoomScene extends Phaser.Scene {
  protected abstract readonly room: RoomDefinition;
  protected player!: Player;
  private interactions!: InteractionSystem;
  private resume = false;
  private saveTimer = 0;

  // data.resume : reprendre la sauvegarde (Continuer) ; sinon nouvelle partie.
  init(data?: { resume?: boolean }): void {
    this.resume = data?.resume === true;
  }

  create(): void {
    const cam = this.cameras.main;
    // Le canvas est RENDER_SCALE fois plus grand que le monde logique : on zoome d'autant
    // (nombre entier, donc pixel-art net). Origine en haut a gauche : ecran = zoom x (monde - scroll).
    cam.setViewport(GAME_VIEW.x, GAME_VIEW.y, GAME_VIEW.width * RENDER_SCALE, GAME_VIEW.height * RENDER_SCALE);
    cam.setOrigin(0, 0).setZoom(RENDER_SCALE);

    this.buildScenery();
    cam.fadeIn(300, 0, 0, 0);

    const save = this.resume ? loadGame() : null;
    const spawn = save ? { x: save.x * this.room.width, y: this.room.spawn.y } : this.room.spawn;
    controls.health = save ? Math.min(controls.maxHealth, save.health) : controls.maxHealth;
    controls.stamina = save ? save.stamina : 1;
    controls.locked = false;
    controls.run = false;
    controls.move.x = 0;
    controls.move.y = 0;
    this.player = new Player(this, new WalkGraph(this.room.paths), spawn, this.room.heroScale ?? 1);
    if (save) this.player.setFacing(save.facing);
    this.interactions = new InteractionSystem(this, this.room.interactables, this.player);
    cam.scrollX = this.followTarget();
    cam.scrollY = 0;

    // Sauvegarde automatique : au demarrage, toutes les 3 s, et quand la page passe en arriere-plan.
    this.writeSave();
    const onHidden = () => document.visibilityState === 'hidden' && this.writeSave();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', this.writeSave);
    EventBus.on(GameEvents.SaveRequest, this.writeSave, this);

    EventBus.on(GameEvents.Interact, this.onInteract, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.writeSave();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', this.writeSave);
      EventBus.off(GameEvents.SaveRequest, this.writeSave, this);
      EventBus.off(GameEvents.Interact, this.onInteract, this);
      this.interactions.destroy();
    });
  }

  private readonly writeSave = (): void => {
    saveGame({
      room: this.room.id,
      x: this.player.position.x / this.room.width,
      facing: this.player.facingDirection,
      health: controls.health,
      stamina: controls.stamina,
    });
  };

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.saveTimer += dt;
    if (this.saveTimer >= 3) {
      this.saveTimer = 0;
      this.writeSave();
    }
    const canRun = controls.run && controls.stamina > 0;
    this.player.update(dt, controls.locked ? { x: 0, y: 0 } : controls.move, canRun);
    const rate = this.player.running ? -STAMINA_DRAIN_RUN : this.player.moving ? STAMINA_REGEN_WALK : STAMINA_REGEN_IDLE;
    controls.stamina = Math.min(1, Math.max(0, controls.stamina + rate * dt));
    this.interactions.update();

    // Suivi horizontal du joueur, amorti, sans sortir de la salle.
    const cam = this.cameras.main;
    cam.scrollX += (this.followTarget() - cam.scrollX) * Math.min(1, dt * 8);
  }

  private followTarget(): number {
    return Phaser.Math.Clamp(this.player.position.x - LOGICAL_WIDTH / 2, 0, this.room.width - LOGICAL_WIDTH);
  }

  // Construit le decor. Par defaut : les couches generiques (LAYERS), une image ou un dessin par
  // couche. Une salle avec son propre assemblage (ex. le vaisseau) surcharge cette methode.
  protected buildScenery(): void {
    for (const layer of LAYERS) {
      const image = this.room.layerImages?.[layer.id];
      const container = this.add.container(0, 0).setDepth(layer.depth).setScrollFactor(layer.scrollFactor);
      if (image) container.add(this.add.image(0, 0, image).setOrigin(0));
      else this.drawLayer(layer.id, container, layerWidth(this.room.width, GAME_VIEW.width, layer.scrollFactor));
    }
    for (const def of this.room.interactables) this.drawInteractable(def);
  }

  // Couche sans image fournie : rien par defaut.
  protected drawLayer(_id: LayerId, _container: Phaser.GameObjects.Container, _width: number): void {}

  protected drawInteractable(_def: InteractableDef): void {}

  // Reaction par defaut : a remplacer par les vrais dialogues / ouvertures / changements de salle.
  protected onInteract(def: InteractableDef): void {
    EventBus.emit(GameEvents.DialogueOpen, [{ speaker: def.label, text: 'Interaction à définir.' }]);
  }
}
