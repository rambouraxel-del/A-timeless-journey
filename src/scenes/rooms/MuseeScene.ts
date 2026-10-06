import Phaser from 'phaser';
import { GAME_VIEW, LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import {
  ARTWORKS,
  type Artwork,
  artworkById,
  artworkCenterX,
  DOOR,
  doorGeo,
  doorMirrored,
  EXIT,
  exitGeo,
  exitTexture,
  groundY,
  GUIDED_STEPS,
  HERO_VISIBLE_HEIGHT,
  largeKey,
  largeUrl,
  musee,
  MYSTERIOUS,
  npcDefs,
  PARTS,
  partKey,
  S,
  SACRE_MUSIC_AFTER,
  SACRE_MUSIC_BEFORE,
  thumbKey,
} from '@/data/rooms/musee';
import { Door } from '@/entities/Door';
import { depthForFeet, MuseeCrowd } from '@/entities/MuseeCrowd';
import { controls } from '@/systems/Controls';
import { dialogue, indication } from '@/systems/Dialogues';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { gameState } from '@/systems/GameState';
import { Music, playSound } from '@/systems/Music';
import { DEPTH } from '@/world/Layers';
import type { InteractableDef } from '@/world/RoomDefinition';
import { spriteBox } from '@/world/spriteBox';
import { RoomScene } from './RoomScene';

// Limite de progression : le heros peut aller un peu au-dela du professeur, pas plus (pixels d'origine
// apres le centre du tableau de l'etape).
const PROGRESS_MARGIN = 300;
// Evacuation (apres l'alarme) : garde poste avant le Sacre ; le heros ne peut pas aller a moins de `gap` de lui
// (pixels d'origine de la galerie).
const EVACUATION = { guard: 'agent_1', guardX: 5140, gap: 70 };
// Arrivee du garde : il part hors de l'ecran (a gauche) et marche a cette vitesse (pixels/s) ; marge hors ecran (pixels).
const GUARD_SPEED = 125;
const GUARD_ENTRY_MARGIN = 100;
// Le heros repousse par le garde s'arrete a cette distance supplementaire au-dela de sa limite (pixels d'origine).
const PUSH_EXTRA = 14;
// Intervalle minimal entre deux rappels courts quand le joueur insiste contre la limite (ms).
const NUDGE_COOLDOWN = 7000;

// Salle du musee et scene 1 du prologue : arrivee, visite guidee, anomalie du Sacre, rencontre de l'homme
// mysterieux, alarme. Tous les textes viennent de scene01.fr.json ; ici ne se trouvent que les conditions,
// la mise en scene et leurs consequences (etat dans gameState.story, ecrit dans la sauvegarde).
export class MuseeScene extends RoomScene {
  protected readonly room = musee;
  private crowd!: MuseeCrowd;
  private evacuating = false;
  // Evacuation : x que le heros ne peut pas depasser vers la gauche (le garde avance, la limite avec lui).
  private guardLimitX = -Infinity;
  private guardWarnedAt = -1;
  private remindedStep = -1;
  private lastNudge = 0;
  private alarmOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super(SceneKeys.Musee);
  }

  create(): void {
    this.evacuating = false;
    this.guardWarnedAt = -1;
    this.remindedStep = -1;
    this.alarmOverlay = null;
    super.create();
    const story = gameState.story;
    // Sauvegarde d'une version precedente (visite finie sans presentation du Sacre) : la derniere etape
    // reste a faire, sinon l'alarme ne pourrait jamais se declencher.
    if (story.scene01.introDone && !story.scene01.anomalyFound && gameState.visit.step >= GUIDED_STEPS.length) gameState.visit.step = GUIDED_STEPS.length - 1;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => Music.play(null));

    if (story.scene01.alarmTriggered && !story.scene01.done) this.startAlarm(false);
    // Apres l'alarme : evacuation, un garde barre le retour vers la visite.
    if (story.scene01.alarmTriggered) {
      void this.startEvacuation();
      this.time.delayedCall(900, () => this.hint(indication('objectif_suivre'), 3000));
    }

    if (!story.scene01.introDone) {
      // Nouvelle partie : le heros est a l'entree, au milieu de ses camarades.
      this.player.placeAt(this.room.spawn);
      this.player.setFacing(1);
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.player.position.x - LOGICAL_WIDTH / 2, 0, this.room.width - LOGICAL_WIDTH);
      this.runCutscene(() => this.intro(), 700);
    } else if (story.scene01.anomalyFound && !story.scene01.alarmTriggered) {
      // Reprise au milieu du final (securite) : on rejoue la suite a partir du premier evenement non termine.
      this.runCutscene(() => this.finale(), 600);
    } else if (gameState.visit.step < GUIDED_STEPS.length) {
      this.time.delayedCall(900, () => this.hintStep('etape'));
    }
  }

  // --- Decor ------------------------------------------------------------------------

  protected buildScenery(): void {
    // Quatre parties de 1536 px, sans raccord : chacune s'arrete la ou commence la suivante.
    PARTS.forEach((part, i) => {
      const left = Math.round(part.x * S * RENDER_SCALE) / RENDER_SCALE;
      const next = i + 1 < PARTS.length ? Math.round(PARTS[i + 1].x * S * RENDER_SCALE) / RENDER_SCALE : this.room.width;
      this.add
        .image(left, 0, partKey(part.file))
        .setOrigin(0, 0)
        .setDisplaySize(next - left + (i + 1 < PARTS.length ? 1 / RENDER_SCALE : 0), part.height * S)
        .setDepth(30);
    });

    // Porte d'entree (voir Door) : au niveau des equipements, le heros passe devant.
    this.doors.set(DOOR.id, new Door(this, doorGeo, doorMirrored));
    // Sortie de secours : image separee, sans animation d'ouverture (le heros joue son interaction, puis fondu).
    this.add.image(exitGeo.x, exitGeo.y, exitTexture).setOrigin(0.5, 1).setDisplaySize(exitGeo.width, exitGeo.height).setDepth(DEPTH.interactables);

    // Tableaux : objets separes du decor, a leur rectangle d'affichage.
    for (const art of ARTWORKS) {
      const [x, y, w, h] = art.rect;
      const image = this.add.image((x + w / 2) * S, (y + h) * S, thumbKey(art.id)).setOrigin(0.5, 1).setDisplaySize(w * S, h * S).setDepth(DEPTH.interactables);
      image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // reduction douce de l'image
    }

    // Personnages : cours (professeur + etudiants) selon l'avancement, visiteurs et agents.
    this.crowd = new MuseeCrowd(this, (id) => {
      const def = npcDefs.get(id);
      if (def) this.interactions?.relocate(def);
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (!controls.locked) this.crowd.update(time, this.cameras.main.scrollX);
    // Evacuation : le garde bloque physiquement le passage vers la gauche.
    if (this.evacuating && this.player.limitMinX(this.guardLimitX) && controls.move.x < -0.3 && !controls.locked) this.onGuardBlock(time);

    // Limite de progression : on ne depasse pas l'etape en cours de la visite.
    const limit = this.progressLimit();
    if (limit !== null && this.player.limitX(limit) && controls.move.x > 0.3 && !controls.locked) this.onBlocked(time);

    // Ordre d'affichage selon les pieds : le heros (sol) passe devant ou derriere les personnages.
    this.player.sprite.setDepth(depthForFeet(this.player.position.y));
    // Ambiance : la musique change a l'approche du Sacre.
    const x = this.player.position.x / S;
    const sacreX = artworkCenterX('sacre') / S;
    Music.play(x > sacreX - SACRE_MUSIC_BEFORE && x < sacreX + SACRE_MUSIC_AFTER ? 'sacre' : 'galerie');
  }

  private progressLimit(): number | null {
    const step = gameState.visit.step;
    if (!gameState.story.scene01.introDone || step >= GUIDED_STEPS.length) return null;
    return artworkCenterX(GUIDED_STEPS[step]) + PROGRESS_MARGIN * S;
  }

  // Le joueur pousse contre la limite : une seule fois la replique du professeur par etape, ensuite un
  // rappel court et espace.
  private onBlocked(time: number): void {
    const step = gameState.visit.step;
    if (this.remindedStep !== step) {
      this.remindedStep = step;
      this.lastNudge = time;
      this.crowd.npc('professeur')?.face(this.player.position.x < this.crowd.npc('professeur')!.x ? -1 : 1);
      EventBus.emit(GameEvents.DialogueOpen, dialogue('visite.rappel'));
    } else if (time - this.lastNudge > NUDGE_COOLDOWN) {
      this.lastNudge = time;
      this.hintStep('groupe_attend');
    }
  }

  private hintStep(id: 'etape' | 'suivre' | 'groupe_attend'): void {
    const step = gameState.visit.step;
    if (step >= GUIDED_STEPS.length) return;
    EventBus.emit(GameEvents.Hint, indication(id, { n: step + 1, oeuvre: artworkById(GUIDED_STEPS[step]).title }));
  }

  // --- Interactions -----------------------------------------------------------------

  protected onInteract(def: InteractableDef): void {
    if (this.inCutscene) return;
    const story = gameState.story;
    controls.dirty = true;

    // Issue de secours : verrouillee jusqu'a l'alarme, puis passage vers la ruelle (fin de la scene 1).
    if (def.id === EXIT.id) {
      if (!story.scene01.alarmTriggered) {
        EventBus.emit(GameEvents.DialogueOpen, dialogue('issue_secours.fermee'));
        return;
      }
      story.scene01.done = true;
      this.stopAlarm();
      super.onInteract(def);
      return;
    }

    // Porte d'entree : on ne quitte pas le musee par la (la liaison vers le vaisseau etait provisoire).
    if (def.id === DOOR.id) {
      this.runCutscene(() => this.say('musee.porte_entree'));
      return;
    }

    // Garde pendant l'evacuation : il rappelle la sortie.
    if (this.evacuating && def.id === EVACUATION.guard) {
      this.crowd.npc(def.id)?.face(this.player.position.x < def.x ? -1 : 1);
      this.runCutscene(() => this.say('musee.evacuation.rappel'));
      return;
    }

    // Professeur : il demande d'observer le tableau, sans lancer la presentation.
    if (def.id === 'professeur') {
      const step = gameState.visit.step;
      if (step >= GUIDED_STEPS.length) return;
      this.crowd.npc('professeur')?.face(this.player.position.x < def.x ? -1 : 1);
      EventBus.emit(GameEvents.DialogueOpen, dialogue(`visite.${GUIDED_STEPS[step]}.professeur`));
      return;
    }

    // Autres personnages : courte replique d'ambiance.
    const ambient = this.crowd.dialogueFor(def.id);
    if (ambient) {
      this.crowd.npc(def.id)?.face(this.player.position.x < def.x ? -1 : 1);
      EventBus.emit(GameEvents.DialogueOpen, dialogue(ambient));
      return;
    }

    const art = ARTWORKS.find((a) => a.id === def.id);
    if (!art) {
      super.onInteract(def);
      return;
    }
    if (!gameState.visit.examined.includes(art.id)) gameState.visit.examined.push(art.id);
    // Tableau de l'etape en cours : presentation du professeur (une seule fois).
    const step = gameState.visit.step;
    if (story.scene01.introDone && !story.scene01.groupLeft && GUIDED_STEPS[step] === art.id && !story.scene01.presentations.includes(art.id)) {
      this.runCutscene(() => this.present(art));
      return;
    }
    // Sinon : description habituelle.
    EventBus.emit(GameEvents.ArtworkOpen, { key: largeKey(art.id), url: largeUrl(art.id), lines: [{ speaker: art.title, text: art.text }] });
  }

  // --- Sequences ----------------------------------------------------------------------

  // 1. Arrivee : conversation avec une camarade, consigne du professeur, puis le groupe rejoint le premier tableau.
  private async intro(): Promise<void> {
    this.player.setFacing(1);
    await this.say('prologue.intro.camarade');
    this.crowd.npc('professeur')?.face(-1);
    await this.say('prologue.intro.professeur');
    await this.fade(true, 350);
    gameState.story.scene01.introDone = true;
    this.crowd.placeGroup();
    await this.fade(false, 350);
    this.hintStep('suivre');
  }

  // 2. Presentation d'une etape. Le groupe rejoint le tableau suivant pendant que l'oeuvre ouverte masque la salle.
  private async present(art: Artwork): Promise<void> {
    const story = gameState.story;
    const last = gameState.visit.step === GUIDED_STEPS.length - 1;
    story.scene01.presentations.push(art.id);
    gameState.visit.step++;
    if (last) story.scene01.anomalyFound = true;
    else this.crowd.placeGroup();
    await this.showLines(() =>
      EventBus.emit(GameEvents.ArtworkOpen, { key: largeKey(art.id), url: largeUrl(art.id), lines: dialogue(`visite.${art.id}.presentation`) }),
    );
    if (last) await this.finale();
    else this.hintStep('suivre');
  }

  // 3 a 5. Depart du groupe, rencontre de l'homme mysterieux, alarme et fuite. Chaque evenement deja vecu
  // (drapeau de gameState.story) est saute.
  private async finale(): Promise<void> {
    const story = gameState.story;
    if (!story.scene01.groupLeft) {
      await this.crowd.leave(this);
      story.scene01.groupLeft = true;
      await this.wait(400);
      await this.say('prologue.depart.pensee');
    }
    let man: Phaser.GameObjects.Image | null = null;
    if (!story.scene01.encounterDone) {
      man = await this.mysteriousArrives();
      await this.say('prologue.rencontre');
      story.scene01.encounterDone = true;
    }
    if (!story.scene01.alarmTriggered) {
      story.scene01.alarmTriggered = true;
      this.startAlarm(true);
      await this.wait(700);
      await this.say('prologue.alarme');
      if (man) await this.mysteriousFlees(man);
      await this.startEvacuation(true);
      EventBus.emit(GameEvents.Hint, indication('fuite'));
      await this.wait(1800);
      this.hint(indication('objectif_suivre'), 3000);
    }
  }

  // L'homme mysterieux apparait a cote du heros, du cote de l'issue de secours, et se tourne vers lui.
  private async mysteriousArrives(): Promise<Phaser.GameObjects.Image> {
    const hx = this.player.position.x;
    const x = Math.min(hx + 120 * S, exitGeo.x - 160 * S);
    const man = this.add.image(x, groundY, MYSTERIOUS.key);
    const box = spriteBox(this, MYSTERIOUS.key);
    man.setOrigin(0.5, box.feetY / box.height).setScale((HERO_VISIBLE_HEIGHT * MYSTERIOUS.size) / box.visibleHeight);
    man.setDepth(depthForFeet(groundY)).setFlipX(x > hx).setAlpha(0); // image tournee vers la droite : retournee pour regarder a gauche
    this.player.setFacing(x > hx ? 1 : -1);
    await new Promise<void>((resolve) => this.tweens.add({ targets: man, alpha: 1, duration: 600, onComplete: () => resolve() }));
    await this.wait(300);
    return man;
  }

  // Fuite vers la droite : il se retourne, puis une courte coupure au noir le fait sortir du champ (sprite
  // immobile : ni glissement ni bond).
  private async mysteriousFlees(man: Phaser.GameObjects.Image): Promise<void> {
    man.setFlipX(false);
    await this.wait(450);
    await this.fade(true, 220);
    man.destroy();
    this.player.setFacing(1);
    await this.wait(150);
    await this.fade(false, 300);
  }

  // Evacuation : visiteurs et groupe sortis, le garde se poste entre le heros et le reste du musee.
  // animated : en scene (alarme), le garde est place hors ecran a gauche puis entre en marchant, et repousse le heros
  // vers la sortie de droite s'il est sur son chemin. Sinon (reprise de partie) il est deja en place.
  private async startEvacuation(animated = false): Promise<void> {
    if (this.evacuating) return;
    this.evacuating = true;
    const guardX = EVACUATION.guardX * S;
    const finalLimit = (EVACUATION.guardX + EVACUATION.gap) * S;
    if (!animated) {
      this.crowd.evacuate(EVACUATION.guard, guardX);
      this.guardLimitX = finalLimit;
      if (this.player.position.x < finalLimit) this.player.placeAt({ x: finalLimit + 10 * S, y: this.room.spawn.y });
      return;
    }
    const from = this.cameras.main.scrollX - GUARD_ENTRY_MARGIN;
    this.guardLimitX = from + EVACUATION.gap * S;
    this.crowd.evacuateOffscreen(this, EVACUATION.guard, from);
    await this.wait(500);
    await this.crowd.walkGuard(this, EVACUATION.guard, guardX, GUARD_SPEED, (x) => {
      this.guardLimitX = x + EVACUATION.gap * S;
      // Le heros recule devant l'agent : il marche vers la droite tant qu'il est sur son chemin.
      this.scriptedMove = this.player.position.x < this.guardLimitX + PUSH_EXTRA * S ? { x: 1, y: 0 } : null;
    });
    this.scriptedMove = null;
    this.guardLimitX = finalLimit;
    this.player.setFacing(1);
  }

  // Le joueur pousse vers le garde : une fois son explication, ensuite un rappel court et espace.
  private onGuardBlock(time: number): void {
    this.crowd.npc(EVACUATION.guard)?.face(1);
    if (!gameState.story.scene02.guardWarned) {
      gameState.story.scene02.guardWarned = true;
      this.guardWarnedAt = time;
      this.runCutscene(() => this.say('musee.evacuation.garde'));
    } else if (time - this.guardWarnedAt > NUDGE_COOLDOWN) {
      this.guardWarnedAt = time;
      this.hint(indication('evacuation'));
    }
  }

  // Alarme : bruitage (si le fichier existe), secousse, voile rouge clignotant sur la scene et indication.
  private startAlarm(withEffects: boolean): void {
    if (!this.alarmOverlay) {
      this.alarmOverlay = this.add.rectangle(0, 0, LOGICAL_WIDTH, GAME_VIEW.height, 0xff2020, 1).setAlpha(0).setOrigin(0).setScrollFactor(0).setDepth(95);
      this.tweens.add({ targets: this.alarmOverlay, alpha: 0.2, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (withEffects) {
      playSound('alarme');
      this.cameras.main.shake(450, 0.004);
      EventBus.emit(GameEvents.Hint, indication('alarme'));
    }
  }

  private stopAlarm(): void {
    if (!this.alarmOverlay) return;
    this.tweens.killTweensOf(this.alarmOverlay);
    this.alarmOverlay.destroy();
    this.alarmOverlay = null;
  }
}
