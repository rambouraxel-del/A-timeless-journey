import Phaser from 'phaser';
import { GAME_VIEW, LOGICAL_WIDTH, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import {
  AROUND,
  depthAtFeet,
  EXIT,
  IMAGES,
  IMPOSSIBLE_DOOR,
  impossibleDoorDef,
  impossibleDoorGeo,
  LAYER_DEPTH,
  OPEN_TO_SHIP,
  roomWidth,
  ruelle,
  S,
  SCENE_TEXTURES,
  SKY_COLOR,
  WOUNDED,
  woundedDef,
  woundedOriginY,
  woundedScale,
} from '@/data/rooms/ruelle';
import { Door } from '@/entities/Door';
import { controls } from '@/systems/Controls';
import { indication } from '@/systems/Dialogues';
import { gameState } from '@/systems/GameState';
import { Hum, Sfx } from '@/systems/Sfx';
import type { InteractableDef } from '@/world/RoomDefinition';
import { makeGlowTexture, makeMoteTexture } from './vaisseauEffects';
import { RoomScene } from './RoomScene';

// Cle brulante : rayon (pixels du panorama) ou la brulure commence, et ou l'attraction de la porte se fait sentir.
const BURN_RADIUS = 420;
const PULL_DISTANCE = 190;
const EMBER = 0xff8a3c;
const PORTAL = 0x9fe9ff;

// Ruelle du Louvre (scene 2 du prologue) : cour finie. Un seul panorama transparent (facade + sol) devant deux plans
// de fond qui defilent plus lentement : batiments lointains (0,65) et ciel (0,15), sur un fond bleu. Les images sont
// chargees a l'entree de la scene et liberees a sa sortie (memoire du telephone).
// Deroulement : arrivee dans la ruelle vide, coup de feu, homme blesse (remise de la cle, mort), porte impossible
// au milieu de la rue (on peut en faire le tour), cle brulante a son approche, ouverture sur le vaisseau, entree.
// Chaque etape est un drapeau de gameState.story (sauvegarde) : rien ne se rejoue.
export class RuelleScene extends RoomScene {
  protected readonly room = ruelle;
  private door!: Door;
  private wounded: Phaser.GameObjects.Image | null = null;
  private handGlow!: Phaser.GameObjects.Image;
  private doorAura!: Phaser.GameObjects.Image;
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hum = new Hum();
  private aroundHintShown = false;

  constructor() {
    super(SceneKeys.Ruelle);
  }

  preload(): void {
    for (const img of [...IMAGES, ...SCENE_TEXTURES]) if (!this.textures.exists(img.key)) this.load.image(img.key, img.url);
  }

  create(): void {
    this.wounded = null;
    this.aroundHintShown = false;
    this.hum = new Hum();
    woundedDef.x = -100000; // l'homme n'apparait qu'apres le coup de feu (showWounded)
    super.create();
    const story = gameState.story;
    // Menu Pause : le bourdonnement se tait (il reprend avec la mise a jour suivante).
    const onPause = () => this.hum.set(0);
    this.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hum.stop();
      this.events.off(Phaser.Scenes.Events.PAUSE, onPause);
    });
    if (story.shotHeard) this.showWounded();
    if (story.doorOpened) this.door.setOpen();

    if (!story.shotHeard) this.runCutscene(() => this.arrival(), 800);
    else if (!story.keyObtained) this.hint(indication('objectif_bruit'), 3000);
    else if (!story.doorOpened) this.hint(indication('objectif_porte'), 3000);
    else this.hint(indication('objectif_seuil'), 3000);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const p = this.player.position;
    this.player.sprite.setDepth(depthAtFeet(p.y));
    this.updateKeyEffects(time, delta);
    if (!controls.locked && !this.inCutscene) this.checkTriggers();
  }

  protected buildScenery(): void {
    this.cameras.main.setBackgroundColor(SKY_COLOR);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const img of [...IMAGES, ...SCENE_TEXTURES]) if (this.textures.exists(img.key)) this.textures.remove(img.key);
    });

    // Filtrage selon la taille reelle a l'ecran. Le pixel art est agrandi sans lissage (NEAREST : contours nets) ; mais
    // quand une image est REDUITE (moins d'un pixel d'ecran par pixel d'image : ecran de bureau a 1x), NEAREST saute des
    // pixels et crenele les contours : on utilise alors LINEAR. Le panorama (2172 x 724) vaut 2,4 pixels d'ecran par
    // pixel sur un iPhone, 0,76 sur un ecran de bureau 1x.
    const deviceRatio = (this.scale.displaySize.width * window.devicePixelRatio) / this.scale.gameSize.width;
    for (const img of IMAGES) {
      const onScreen = img.scale * S * RENDER_SCALE * deviceRatio;
      this.textures.get(img.key).setFilter(onScreen < 1 ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    }

    // Arrondi au pixel d'ecran, identique pour le debut et la fin de chaque image (les bandes des batiments se
    // recouvrent exactement comme dans le manifeste).
    const snap = (v: number) => Math.round(v * S * RENDER_SCALE) / RENDER_SCALE;
    for (const img of IMAGES) {
      const left = snap(img.x * img.scale);
      const top = snap(img.y * img.scale);
      this.add
        .image(left, top, img.key)
        .setOrigin(0, 0)
        .setDisplaySize(snap((img.x + img.width) * img.scale) - left, snap((img.y + img.height) * img.scale) - top)
        .setDepth(LAYER_DEPTH[img.layer])
        .setScrollFactor(img.parallax);
    }

    // Couverture des fonds sur toute la course de la camera : en pixels ecran, l'image doit couvrir
    // [0 ; parallaxe x course + largeur de vue] (la course va de 0 a la largeur du panorama moins la vue).
    const camMax = roomWidth - LOGICAL_WIDTH;
    for (const layer of Object.keys(LAYER_DEPTH)) {
      const parts = IMAGES.filter((i) => i.layer === layer && i.parallax < 1);
      if (parts.length === 0) continue;
      const start = Math.min(...parts.map((i) => i.x * i.scale * S));
      const end = Math.max(...parts.map((i) => (i.x + i.width) * i.scale * S));
      if (start > 0 || end < parts[0].parallax * camMax + LOGICAL_WIDTH) console.warn(`Ruelle : couverture insuffisante de la couche ${layer}`);
    }

    // Porte impossible : seule au milieu de la rue ; ouverte, elle montre l'interieur du vaisseau.
    this.door = new Door(this, impossibleDoorGeo, false, { openKey: OPEN_TO_SHIP.key, glowColor: PORTAL, depth: depthAtFeet(IMPOSSIBLE_DOOR.base * S) });

    // Effets de la cle : lueur dans la main du heros, braises, aura de la porte.
    makeGlowTexture(this, 'fx-glow', 128);
    makeMoteTexture(this, 'fx-mote');
    this.handGlow = this.add.image(0, 0, 'fx-glow').setTint(EMBER).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const geo = impossibleDoorGeo;
    this.doorAura = this.add
      .image(geo.x + geo.passage.dx, geo.y + geo.passage.dy, 'fx-glow')
      .setDisplaySize(geo.visibleWidth * 2.2, geo.passage.height * 1.6)
      .setTint(PORTAL)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depthAtFeet(IMPOSSIBLE_DOOR.base * S) - 0.5)
      .setAlpha(0);
    this.embers = this.add
      .particles(0, 0, 'fx-mote', {
        emitting: false,
        lifespan: { min: 450, max: 800 },
        speedX: { min: -10, max: 10 },
        speedY: { min: -30, max: -12 },
        scale: { start: 0.35, end: 0.05 },
        alpha: { start: 1, end: 0 },
        tint: [EMBER, 0xffd27a],
        blendMode: Phaser.BlendModes.ADD,
      });
  }

  // --- Interactions -----------------------------------------------------------------------

  protected onInteract(def: InteractableDef): void {
    if (this.inCutscene) return;
    const story = gameState.story;
    controls.dirty = true;

    // L'issue de secours ne se rouvre pas de l'exterieur.
    if (def.id === EXIT.id) {
      this.runCutscene(() => this.say('ruelle.sortie_secours'));
      return;
    }

    if (def.id === WOUNDED.id) {
      this.player.setFacing(def.x < this.player.position.x ? -1 : 1);
      if (!story.keyObtained) this.runCutscene(() => this.lastWords());
      else this.runCutscene(() => this.say('ruelle.homme.corps'));
      return;
    }

    if (def.id === IMPOSSIBLE_DOOR.id) {
      if (!story.keyObtained) this.runCutscene(() => this.say('ruelle.porte.verrouillee'));
      else if (!story.doorOpened) this.runCutscene(() => this.unlockDoor());
      else this.enterDoor(def);
      return;
    }
    super.onInteract(def);
  }

  // --- Sequences ------------------------------------------------------------------------

  // Arrivee : ruelle vide, puis coup de feu au fond et bruit de chute (le tireur reste invisible).
  private async arrival(): Promise<void> {
    this.player.setFacing(1);
    await this.wait(400);
    await this.say('ruelle.arrivee');
    await this.wait(600);
    Sfx.gunshot();
    this.cameras.main.shake(280, 0.006);
    this.muzzleFlash();
    await this.wait(450);
    Sfx.thud();
    gameState.story.shotHeard = true;
    this.showWounded();
    await this.wait(500);
    await this.say('ruelle.coup_de_feu');
    this.hint(indication('objectif_bruit'), 3000);
  }

  // Dernieres paroles : la cle est remise, puis l'homme meurt.
  private async lastWords(): Promise<void> {
    await this.say('ruelle.homme.agonie');
    gameState.story.keyObtained = true;
    this.hint(indication('cle_obtenue'), 2200);
    await this.wait(700);
    this.markDead(true);
    await this.wait(600);
    await this.say('ruelle.homme.mort');
    this.hint(indication('objectif_porte'), 3000);
  }

  // La cle tourne, la porte s'ouvre sur le vaisseau. Le joueur reste libre avant de franchir le seuil.
  private async unlockDoor(): Promise<void> {
    this.gestureToward(impossibleDoorDef.x);
    await this.wait(350);
    Sfx.unlock();
    await this.say('ruelle.porte.cle');
    gameState.story.doorOpened = true;
    await this.door.openAsync();
    await this.wait(300);
    await this.say('ruelle.porte.ouverte');
    this.hint(indication('objectif_seuil'), 3000);
  }

  // Franchir le seuil : geste, puis fondu vers le vaisseau (la porte se referme de l'autre cote).
  private enterDoor(def: InteractableDef): void {
    this.inCutscene = true;
    controls.locked = true;
    this.gestureToward(def.x);
    this.time.delayedCall(450, () => this.travel('vaisseau', 'porte_gauche'));
  }

  private showWounded(): void {
    if (this.wounded) return;
    this.wounded = this.add
      .image(WOUNDED.x * S, WOUNDED.feet * S, WOUNDED.key)
      .setOrigin(0.5, woundedOriginY)
      .setScale(woundedScale)
      .setDepth(depthAtFeet(WOUNDED.feet * S));
    woundedDef.x = WOUNDED.x * S;
    this.interactions?.relocate(woundedDef);
    if (gameState.story.keyObtained) this.markDead(false);
  }

  // Mort : le corps s'assombrit legerement (le sprite reste immobile).
  private markDead(animated: boolean): void {
    if (!this.wounded) return;
    const target = 0x8c8c96;
    if (!animated) {
      this.wounded.setTint(target);
      return;
    }
    const from = Phaser.Display.Color.ValueToColor(0xffffff);
    const to = Phaser.Display.Color.ValueToColor(target);
    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 1200,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() ?? 0);
        this.wounded?.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    });
  }

  // Eclair bref sur le bord droit de l'ecran, du cote du fond de la ruelle.
  private muzzleFlash(): void {
    const flash = this.add
      .image(LOGICAL_WIDTH, GAME_VIEW.height * 0.55, 'fx-glow')
      .setScrollFactor(0)
      .setDisplaySize(LOGICAL_WIDTH * 0.9, GAME_VIEW.height * 0.9)
      .setTint(0xfff1c8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(90)
      .setAlpha(0.7);
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
  }

  // --- Cle brulante et attraction ----------------------------------------------------------

  // Distance (pixels du panorama) entre les pieds du heros et le seuil de la porte.
  private doorDistance(): number {
    const p = this.player.position;
    return Math.hypot(p.x - IMPOSSIBLE_DOOR.x * S, p.y - IMPOSSIBLE_DOOR.base * S) / S;
  }

  // Effets proportionnels a la proximite : rien ne deplace le heros, tout diminue quand il s'eloigne.
  private updateKeyEffects(time: number, delta: number): void {
    const story = gameState.story;
    const d = this.doorDistance();
    const near = Phaser.Math.Clamp(1 - d / BURN_RADIUS, 0, 1);
    const burn = story.keyObtained && !story.doorOpened ? near : 0;
    const aura = story.keyObtained ? near * (story.doorOpened ? 0.6 : 1) : 0;
    const pulse = 0.8 + 0.2 * Math.sin(time * 0.009);

    // Lueur dans la main (cote du regard, a mi-hauteur du heros).
    const p = this.player.position;
    const h = this.player.sprite.displayHeight * 0.68;
    const hx = p.x + this.player.facingDirection * h * 0.12;
    const hy = p.y - h * 0.42;
    this.handGlow
      .setPosition(hx, hy)
      .setDisplaySize(h * (0.25 + 0.25 * burn), h * (0.25 + 0.25 * burn))
      .setDepth(this.player.sprite.depth + 0.05)
      .setAlpha(burn * 0.75 * pulse);
    this.embers.setDepth(this.player.sprite.depth + 0.06);
    if (burn > 0.05 && Math.random() < burn * delta * 0.012) this.embers.emitParticleAt(hx, hy, 1);

    this.doorAura.setAlpha(aura * 0.32 * (0.85 + 0.15 * Math.sin(time * 0.004)));
    this.hum.set(Math.max(burn, aura * 0.5));
  }

  // Pensees declenchees par la position du heros (une seule fois chacune, sauvegardees).
  private checkTriggers(): void {
    const story = gameState.story;
    const d = this.doorDistance();
    const p = this.player.position;
    const near = 1 - d / BURN_RADIUS;

    if (story.keyObtained && !story.doorOpened && !story.keyBurnFelt && near > 0.3) {
      story.keyBurnFelt = true;
      this.runCutscene(() => this.say('ruelle.cle.brule'));
      return;
    }
    if (story.keyObtained && !story.doorOpened && story.keyBurnFelt && !story.doorPullFelt && d < PULL_DISTANCE) {
      story.doorPullFelt = true;
      this.runCutscene(async () => {
        await this.say('ruelle.porte.attraction');
        this.aroundHintShown = true;
        this.hint(indication('tour_porte'), 3000);
      });
      return;
    }
    if (!this.aroundHintShown && story.shotHeard && d < 330) {
      this.aroundHintShown = true;
      this.hint(indication('tour_porte'), 3000);
    }
    // Derriere la porte (allee du fond, a son aplomb) : elle ne mene nulle part.
    const behind = p.y < (AROUND.back.y + 8) * S && Math.abs(p.x - IMPOSSIBLE_DOOR.x * S) < 45 * S;
    if (behind && !story.doorOpened && !story.doorBehindSeen) {
      story.doorBehindSeen = true;
      this.runCutscene(() => this.say('ruelle.porte.derriere'));
    } else if (behind && story.doorOpened && !story.doorBehindOpenSeen) {
      story.doorBehindOpenSeen = true;
      this.runCutscene(() => this.say('ruelle.porte.derriere_ouverte'));
    }
  }
}
