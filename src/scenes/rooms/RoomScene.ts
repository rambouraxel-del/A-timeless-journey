import Phaser from 'phaser';
import type { ItemId } from '@/config/Items';
import { GAME_VIEW, LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { Player } from '@/entities/Player';
import { controls } from '@/systems/Controls';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { InteractionSystem } from '@/systems/InteractionSystem';
import type { Door } from '@/entities/Door';
import { destinationOf } from '@/data/rooms/connections';
import { roomSceneKey } from '@/data/rooms/registry';
import { dialogue } from '@/systems/Dialogues';
import { gameState } from '@/systems/GameState';
import { cloneStory, getActiveSlot, loadSlot, saveSlot } from '@/systems/SaveGame';
import { LAYERS, type LayerId, layerWidth } from '@/world/Layers';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { WalkGraph } from '@/world/WalkGraph';

// Endurance (0 a 1) : perte en courant, gain en marchant, gain a l'arret. Par seconde.
const STAMINA_DRAIN_RUN = 0.0625;
const STAMINA_REGEN_WALK = 0.05;
const STAMINA_REGEN_IDLE = 0.1;
// Endurance a zero : essoufflement de 5 s, marche 30 % plus lente, recharge 50 % plus lente.
const BREATHLESS_SECONDS = 5;
const BREATHLESS_WALK_FACTOR = 0.7;
const BREATHLESS_REGEN_FACTOR = 0.5;
// Distance (px) entre le bord d'une porte et le heros qui en sort (hors de portee de la porte, qui s'arrete 24 px apres son bord).
const ARRIVAL_GAP = 36;

// Base commune a toutes les salles : couches de profondeur, camera, joueur, interactions.
// Une salle concrete fournit sa definition et, si besoin, dessine ses couches sans image.
export abstract class RoomScene extends Phaser.Scene {
  protected abstract readonly room: RoomDefinition;
  protected player!: Player;
  protected interactions!: InteractionSystem;
  private resume = false;
  protected arrivalDoor: string | null = null;
  private travelling = false;
  // Sequence scenarisee en cours : les interactions sont ignorees.
  protected inCutscene = false;
  // Cinematique : le heros avance tout seul (null : immobile tant que les commandes sont bloquees).
  protected scriptedMove: { x: number; y: number; run?: boolean } | null = null;
  // Cinematique : point (x monde) que la camera suit a la place du heros (null : le heros).
  private cameraFocusX: number | null = null;
  // Portes animees de la salle (par id d'objet) : elles s'ouvrent avant le changement de salle.
  protected readonly doors = new Map<string, Door>();

  // data.resume : reprendre la sauvegarde (Continuer) ; data.arrivalDoor : arrivee par une porte
  // d'une autre salle ; sinon nouvelle partie.
  init(data?: { resume?: boolean; arrivalDoor?: string }): void {
    this.resume = data?.resume === true;
    this.cameraFocusX = null;
    this.arrivalDoor = data?.arrivalDoor ?? null;
    this.travelling = false;
    this.inCutscene = false;
    this.scriptedMove = null;
  }

  create(): void {
    const cam = this.cameras.main;
    // Le canvas est RENDER_SCALE fois plus grand que le monde logique : on zoome d'autant
    // (nombre entier, donc pixel-art net). Origine en haut a gauche : ecran = zoom x (monde - scroll).
    cam.setViewport(GAME_VIEW.x, GAME_VIEW.y, GAME_VIEW.width * RENDER_SCALE, GAME_VIEW.height * RENDER_SCALE);
    cam.setOrigin(0, 0).setZoom(RENDER_SCALE);

    this.buildScenery();
    cam.fadeIn(300, 0, 0, 0);

    gameState.room = this.room.id;
    gameState.sceneKey = this.scene.key;
    const save = this.resume ? loadSlot(getActiveSlot()) : null;
    // Arrivee par une porte : a cote de la porte correspondante, cote interieur de la salle.
    const door = this.arrivalDoor ? this.room.interactables.find((d) => d.id === this.arrivalDoor) : undefined;
    const doorSide: -1 | 1 = door && door.x > this.room.width / 2 ? -1 : 1;
    let spawn = this.room.spawn;
    if (save) spawn = { x: save.x * this.room.width, y: save.y !== undefined ? save.y * this.room.height : this.room.spawn.y };
    else if (door) spawn = { x: door.x + doorSide * ((door.reachX ?? door.width / 2 + 28) + ARRIVAL_GAP - 24), y: door.standY ?? this.room.spawn.y };
    controls.health = save ? Math.min(controls.maxHealth, save.health) : controls.maxHealth;
    controls.stamina = save ? save.stamina : 1;
    controls.locked = false;
    controls.cutscene = false;
    if (!this.arrivalDoor) controls.breathless = 0;
    controls.run = false;
    controls.move.x = 0;
    controls.move.y = 0;
    this.player = new Player(this, new WalkGraph(this.room.paths), spawn, this.room.heroScale ?? 1);
    if (save) this.player.setFacing(save.facing);
    else if (door) this.player.setFacing(doorSide);
    this.interactions = new InteractionSystem(this, this.room.interactables, this.player);
    cam.scrollX = this.followTarget();
    cam.scrollY = 0;

    // Sauvegarde manuelle (menu Pause) dans l'emplacement actif. Une nouvelle partie reserve
    // son emplacement des le depart.
    if (!save && !door) this.writeSave();
    if (!door) controls.dirty = false;
    EventBus.on(GameEvents.SaveRequest, this.writeSave, this);

    EventBus.on(GameEvents.Interact, this.onInteract, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.SaveRequest, this.writeSave, this);
      EventBus.off(GameEvents.Interact, this.onInteract, this);
      this.interactions.destroy();
    });
  }

  protected readonly writeSave = (): void => {
    const ok = saveSlot(getActiveSlot(), {
      room: this.room.id,
      place: this.room.name,
      playTime: Math.floor(gameState.playTime),
      visit: { step: gameState.visit.step, examined: [...gameState.visit.examined] },
      story: cloneStory(gameState.story),
      x: this.player.position.x / this.room.width,
      y: this.player.position.y / this.room.height,
      facing: this.player.facingDirection,
      health: controls.health,
      stamina: controls.stamina,
    });
    if (ok) controls.dirty = false;
  };

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    gameState.playTime += dt;
    const breathless = controls.breathless > 0;
    const scripted = controls.locked ? this.scriptedMove : null;
    const canRun = (scripted ? scripted.run === true : controls.run) && controls.stamina > 0 && !breathless;
    this.player.update(dt, scripted ?? (controls.locked ? { x: 0, y: 0 } : controls.move), canRun, breathless ? BREATHLESS_WALK_FACTOR : 1);
    let rate = this.player.running ? -STAMINA_DRAIN_RUN : this.player.moving ? STAMINA_REGEN_WALK : STAMINA_REGEN_IDLE;
    if (rate > 0 && breathless) rate *= BREATHLESS_REGEN_FACTOR;
    const before = controls.stamina;
    controls.stamina = Math.min(1, Math.max(0, controls.stamina + rate * dt));
    controls.breathless = Math.max(0, controls.breathless - dt);
    if (before > 0 && controls.stamina <= 0) controls.breathless = BREATHLESS_SECONDS;
    if (this.player.moving) controls.dirty = true;
    this.interactions.update();

    // Suivi horizontal du joueur, amorti, sans sortir de la salle.
    const cam = this.cameras.main;
    cam.scrollX += (this.followTarget() - cam.scrollX) * Math.min(1, dt * 8);
  }

  private followTarget(): number {
    const x = this.cameraFocusX ?? this.player.position.x;
    return Phaser.Math.Clamp(x - LOGICAL_WIDTH / 2, 0, this.room.width - LOGICAL_WIDTH);
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

  // Reaction par defaut : une porte reliee (connections.ts) change de salle ; le reste est a
  // remplacer par les vrais dialogues.
  protected onInteract(def: InteractableDef): void {
    controls.dirty = true;
    const link = def.kind === 'door' ? destinationOf(this.room.id, def.id) : null;
    if (link) {
      const door = this.doors.get(def.id);
      if (door) {
        controls.locked = true;
        // Le heros se tourne vers la porte et joue son animation d'interaction pendant l'ouverture.
        const toward = Math.sign(def.x - this.player.position.x);
        this.player.interact(toward === 0 ? this.player.facingDirection : (toward as -1 | 1));
        door.play(() => this.travel(link.room, link.door));
      } else {
        // Porte dessinee dans le decor : le heros se tourne vers elle, puis fondu.
        controls.locked = true;
        const toward = Math.sign(def.x - this.player.position.x);
        this.player.interact(toward === 0 ? this.player.facingDirection : (toward as -1 | 1));
        this.time.delayedCall(700, () => this.travel(link.room, link.door));
      }
      return;
    }
    EventBus.emit(GameEvents.DialogueOpen, [{ speaker: def.label, text: 'Interaction à définir.' }]);
  }

  // --- Mise en scene -----------------------------------------------------------------

  // Sequence scenarisee : commandes bloquees du debut a la fin, une seule a la fois.
  protected runCutscene(fn: () => Promise<void>, delay = 0): void {
    if (this.inCutscene) return;
    this.inCutscene = true;
    controls.cutscene = true;
    controls.locked = true;
    this.time.delayedCall(delay, () => {
      void fn().finally(() => {
        this.inCutscene = false;
        controls.cutscene = false;
        controls.locked = false;
        controls.dirty = true;
      });
    });
  }

  // Affiche un dialogue de dialogues*.json et attend sa fermeture.
  protected say(id: string): Promise<void> {
    return this.showLines(() => EventBus.emit(GameEvents.DialogueOpen, dialogue(id)));
  }

  // Animation « objet obtenu » (src/config/Items.ts) ; attend sa fin.
  protected pickItem(id: ItemId): Promise<void> {
    return new Promise((resolve) => {
      EventBus.once(GameEvents.ItemPickupClosed, () => resolve());
      EventBus.emit(GameEvents.ItemPickup, id);
    });
  }

  protected showLines(open: () => void): Promise<void> {
    return new Promise((resolve) => {
      EventBus.once(GameEvents.DialogueClosed, () => resolve());
      open();
    });
  }

  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  protected fade(out: boolean, ms = 300): Promise<void> {
    const cam = this.cameras.main;
    return new Promise((resolve) => {
      if (out) {
        cam.fadeOut(ms, 0, 0, 0);
        cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
      } else {
        cam.fadeIn(ms, 0, 0, 0);
        cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => resolve());
      }
    });
  }

  // Message court en bas de la scene (objectif : affiche plus longtemps).
  protected hint(text: string, holdMs?: number): void {
    EventBus.emit(GameEvents.Hint, text, holdMs);
  }

  // La camera glisse vers x (monde) et y reste ; null la ramene sur le heros.
  protected panCamera(x: number | null, duration = 1200): Promise<void> {
    const cam = this.cameras.main;
    const to = x ?? this.player.position.x;
    return new Promise((resolve) => {
      this.tweens.addCounter({
        from: cam.scrollX + LOGICAL_WIDTH / 2,
        to,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => (this.cameraFocusX = tw.getValue() ?? to),
        onComplete: () => {
          this.cameraFocusX = x;
          resolve();
        },
      });
    });
  }

  // Le heros se tourne vers un objet et joue son geste d'interaction.
  protected gestureToward(x: number): void {
    const toward = Math.sign(x - this.player.position.x);
    this.player.interact(toward === 0 ? this.player.facingDirection : (toward as -1 | 1));
  }

  // Changement de salle, declenche uniquement par une interaction explicite : fondu puis arrivee
  // a cote de la porte correspondante.
  protected travel(room: string, door: string): void {
    if (this.travelling) return;
    this.travelling = true;
    controls.locked = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(roomSceneKey(room), { arrivalDoor: door });
    });
  }
}
