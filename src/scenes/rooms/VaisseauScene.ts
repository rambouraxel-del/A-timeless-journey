import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import {
  CABINET_ID,
  CONSOLE_ID,
  DOOR_ID,
  effects as manifestEffects,
  HOURGLASS_ID,
  layers,
  porteGeo,
  porteMirrored,
  propScale,
  props,
  roomWidth,
  sx,
  sy,
  textureKey,
  vaisseau,
} from '@/data/rooms/vaisseau';
import { Door } from '@/entities/Door';
import { controls } from '@/systems/Controls';
import { consoleScreen, indication } from '@/systems/Dialogues';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { gameState } from '@/systems/GameState';
import { getSettings, reached } from '@/systems/SaveGame';
import { Hum, Sfx } from '@/systems/Sfx';
import type { InteractableDef } from '@/world/RoomDefinition';
import type { ConsoleResult } from '@/ui/ConsoleView';
import { addVaisseauEffects, makeGlowTexture, makeMoteTexture, type ScreenId, type VaisseauEffects } from './vaisseauEffects';
import { RoomScene } from './RoomScene';

// Ecrans eteints : rectangles des ecrans dans les images des equipements (pixels de texture). Dans ces zones, les
// pixels bleutes ou tres clairs sont assombris ; le cadre des ecrans ne change pas.
const SCREENS: Record<ScreenId, [number, number, number, number][]> = {
  console: [
    [36, 30, 114, 112],
    [140, 8, 456, 120],
    [470, 32, 556, 112],
  ],
  ecran_mural: [[6, 16, 66, 160]],
};

// Obscurite : voile noir sur toute la salle (sous l'interface). Opacite selon l'etat du vaisseau.
const DARK = { depth: 75, off: 0.9, broken: 0.58 };
const CYAN = 0x38d8ff;
const EMERGENCY = 0xff3b30;
// Sablier temporel (reacteur) : centre de la lumiere, en pixels de texture (scene.json, effet reactor-pulse).
const HOURGLASS_CORE = manifestEffects.find((e) => e.id === 'reactor-pulse')?.anchor ?? [1760, 615];
// Pensees d'exploration declenchees par la position (pixels de texture) : une seule fois chacune.
const EXPLORE_THOUGHTS = [
  { id: 'vaisseau.explore.couloir', when: (x: number) => x > 800 },
  { id: 'vaisseau.explore.sablier', when: (x: number) => Math.abs(x - 1760) < 330 },
];

// Salle du vaisseau. Assemble les panneaux du pack (fond, structure, rebord, premier plan) et ses equipements, aux
// profondeurs prevues par scene.json : le heros (50) passe devant les equipements (40), derriere le rebord (60).
// Scene 2 (fin) : arrivee dans le noir, la porte se referme, allumage progressif.
// Scene 3 : exploration, console (signal de detresse), activation du sablier temporel, panne, sortie vers la foret.
// Etapes : gameState.story.scene03.step (explore -> signal -> breakdown -> forest), jamais rejouees.
export class VaisseauScene extends RoomScene {
  protected readonly room = vaisseau;
  private door!: Door;
  private effects: VaisseauEffects | null = null;
  private screensOff = new Map<ScreenId, Phaser.GameObjects.Image>();
  private propImages = new Map<string, Phaser.GameObjects.Image>();
  private dark!: Phaser.GameObjects.Rectangle;
  private emergency!: Phaser.GameObjects.Rectangle;
  private doorLight!: Phaser.GameObjects.Image;
  private hum = new Hum();
  private awakening = false;

  constructor() {
    super(SceneKeys.Vaisseau);
  }

  create(): void {
    const story = gameState.story;
    // Premiere arrivee par la porte de la ruelle : le vaisseau est encore eteint.
    this.awakening = this.arrivalDoor === DOOR_ID && story.scene02.doorOpened && !story.scene02.vaisseauReached;
    this.screensOff = new Map();
    this.propImages = new Map();
    this.effects = null;
    this.hum = new Hum();
    super.create();
    const onPause = () => this.hum.set(0);
    this.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hum.stop();
      this.events.off(Phaser.Scenes.Events.PAUSE, onPause);
    });
    if (this.awakening) this.runCutscene(() => this.arrival(), 500);
    else if (this.broken) this.hint(indication('objectif_sortir'), 3000);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (!controls.locked && !this.inCutscene) this.checkExploration();
  }

  private get s3() {
    return gameState.story.scene03;
  }

  private get broken(): boolean {
    return reached(this.s3, 'breakdown');
  }

  // --- Decor -------------------------------------------------------------------------------

  protected buildScenery(): void {
    for (const layer of layers) {
      const image = this.add
        .image(layer.x * sx, layer.y * sy, textureKey(layer.file))
        .setOrigin(layer.origin[0], layer.origin[1])
        // Chaque panneau remplit exactement une largeur de vue : 4 panneaux = 4 ecrans.
        .setDisplaySize(layer.width * sx, layer.height * sy)
        .setDepth(layer.depth)
        .setScrollFactor(layer.scrollFactor);
      // Parallaxe legere du premier plan proche (scrollFactor > 1) : le panneau est recale pour
      // etre parfaitement aligne quand la camera est centree dessus, donc aux deux extremites.
      if (layer.scrollFactor !== 1) image.x += (layer.scrollFactor - 1) * layer.x * sx;
    }

    const screensDark = this.awakening || this.broken;
    for (const prop of props) {
      const image = this.add
        .image(prop.x * sx, prop.y * sy, textureKey(prop.file))
        .setOrigin(prop.origin[0], prop.origin[1])
        .setScale(propScale)
        .setDepth(prop.depth)
        .setScrollFactor(prop.scrollFactor);
      this.propImages.set(prop.id, image);
      // Ecrans eteints : calque cree juste apres l'equipement (donc sous la plante voisine, ajoutee apres).
      const id = prop.id as ScreenId;
      if (SCREENS[id]) this.screensOff.set(id, this.screenOverlay(image, id).setAlpha(screensDark ? 1 : 0));
    }

    this.door = new Door(this, porteGeo, porteMirrored);
    this.doors.set(DOOR_ID, this.door);
    if (this.awakening) this.door.setOpen();

    makeGlowTexture(this, 'fx-glow', 128);
    makeMoteTexture(this, 'fx-mote');
    if (getSettings().ambient) this.effects = addVaisseauEffects(this);
    if (screensDark && this.effects) for (const glows of Object.values(this.effects.screens)) glows.setAlpha(0);

    // Obscurite et eclairage de secours (rouge, tres doux) ; lumiere de la porte ouverte a l'arrivee.
    this.dark = this.add.rectangle(-40, -40, roomWidth + 80, vaisseau.height + 80, 0x020308, 1).setOrigin(0).setDepth(DARK.depth);
    this.dark.setAlpha(this.awakening ? DARK.off : this.broken ? DARK.broken : 0);
    this.emergency = this.add
      .rectangle(-40, -40, roomWidth + 80, vaisseau.height + 80, EMERGENCY, 1)
      .setOrigin(0)
      .setDepth(DARK.depth + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const geo = porteGeo;
    this.doorLight = this.add
      .image(geo.x + geo.passage.dx, geo.y + geo.passage.dy, 'fx-glow')
      .setDisplaySize(geo.passage.width * 3, geo.passage.height * 1.6)
      .setTint(0xfff1d0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DARK.depth + 1)
      .setAlpha(this.awakening ? 0.55 : 0);

    if (this.awakening && this.effects) this.effects.lights.setAlpha(0);
    if (this.broken) this.applyBreakdown(false);
  }

  // Etat en panne : lumieres et ecrans eteints, sablier eteint, fumee, eclairage de secours, porte mise en valeur.
  private applyBreakdown(animated: boolean): void {
    const fx = this.effects;
    if (fx) {
      fx.motes?.stop();
      const off = [fx.lights, fx.reactor, ...Object.values(fx.screens)];
      if (animated) this.tweens.add({ targets: off, alpha: 0, duration: 400 });
      else for (const o of off) o.setAlpha(0);
    }
    const hourglass = this.propImages.get(HOURGLASS_ID);
    if (hourglass) {
      if (animated) this.tintTo(hourglass, 0x5c6672, 1500);
      else hourglass.setTint(0x5c6672);
    }
    this.tweens.add({ targets: this.emergency, alpha: { from: 0.02, to: 0.07 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // La porte, seule issue : un liseré de lumiere l'entoure doucement.
    this.tweens.add({ targets: this.doorLight, alpha: { from: 0.12, to: 0.28 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: animated ? 2500 : 0 });
    this.startSmoke();
    // Gresillements de temps en temps.
    this.time.addEvent({ delay: 4200, loop: true, callback: () => Math.random() < 0.6 && Sfx.crackle() });
  }

  // Fumee localisee au pied du sablier, etincelles rares.
  private startSmoke(): void {
    const [cx] = HOURGLASS_CORE;
    const base = { x: cx * sx, y: 930 * sy };
    this.add
      .particles(base.x, base.y, 'fx-glow', {
        x: { min: -120 * sx, max: 120 * sx },
        lifespan: { min: 3000, max: 5200 },
        speedY: { min: -16, max: -7 },
        speedX: { min: -6, max: 8 },
        scale: { start: 0.08 * propScale + 0.05, end: 0.5 * propScale + 0.25 },
        alpha: { start: 0.45, end: 0 },
        tint: [0x7a7e86, 0x9a9ea6],
        frequency: 260,
        maxAliveParticles: 22,
      })
      .setDepth(DARK.depth + 1.5);
    this.add
      .particles(base.x, 820 * sy, 'fx-mote', {
        x: { min: -140 * sx, max: 140 * sx },
        lifespan: { min: 300, max: 600 },
        speedY: { min: -40, max: 30 },
        speedX: { min: -50, max: 50 },
        gravityY: 120,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: [0xffb35c, 0xfff1c8],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 2400,
        quantity: 3,
      })
      .setDepth(DARK.depth + 1.6);
  }

  // --- Interactions ------------------------------------------------------------------------

  protected onInteract(def: InteractableDef): void {
    if (this.inCutscene) return;
    const story = gameState.story;
    const step = this.s3.step;
    controls.dirty = true;

    if (def.id === DOOR_ID) {
      // Ancienne sauvegarde sans arrivee : comportement d'avant (porte reliee a la ruelle).
      if (!story.scene02.vaisseauReached) return super.onInteract(def);
      if (this.broken) return this.exitToForest(def);
      this.runCutscene(() => this.say(step === 'signal' ? 'vaisseau.porte.signal' : 'vaisseau.porte'));
      return;
    }

    if (def.id === CABINET_ID) {
      this.runCutscene(() => this.sayOnce('vaisseau.armoire', 'vaisseau.armoire.encore'));
      return;
    }

    if (def.id === CONSOLE_ID) {
      this.gestureToward(def.x);
      if (step === 'explore') this.runCutscene(() => this.readConsole(), 300);
      else if (step === 'signal') this.runCutscene(async () => void (await this.openConsole('attente')), 300);
      else
        this.runCutscene(async () => {
          await this.openConsole('panne', true);
          await this.say('vaisseau.console.panne');
        }, 300);
      return;
    }

    if (def.id === HOURGLASS_ID) {
      if (step === 'explore') this.runCutscene(() => this.sayOnce('vaisseau.sablier.avant', 'vaisseau.sablier.avant.encore'));
      else if (step === 'signal') this.runCutscene(() => this.activateHourglass());
      else this.runCutscene(() => this.say('vaisseau.sablier.panne'));
      return;
    }
    super.onInteract(def);
  }

  // Premiere replique une seule fois (memorisee dans scene03.seen), puis la replique courte.
  private async sayOnce(first: string, again: string): Promise<void> {
    const seen = this.s3.seen;
    if (seen.includes(first)) return this.say(again);
    seen.push(first);
    await this.say(first);
  }

  private checkExploration(): void {
    if (!gameState.story.scene02.vaisseauReached || this.s3.step !== 'explore') return;
    const x = this.player.position.x / sx;
    for (const t of EXPLORE_THOUGHTS) {
      if (this.s3.seen.includes(t.id) || !t.when(x)) continue;
      this.s3.seen.push(t.id);
      this.runCutscene(() => this.say(t.id));
      return;
    }
  }

  // Console : ouvre un ecran et attend le bouton choisi.
  private openConsole(id: string, broken = false): Promise<ConsoleResult> {
    return new Promise((resolve) => {
      EventBus.once(GameEvents.ConsoleClosed, (result: ConsoleResult) => resolve(result));
      Sfx.click();
      EventBus.emit(GameEvents.ConsoleOpen, consoleScreen(id), broken);
    });
  }

  // Lecture de la console avant le depart : suivre le signal de detresse, puis l'ecran demande le sablier.
  private async readConsole(): Promise<void> {
    const result = await this.openConsole('signal');
    const seen = this.s3.seen;
    const firstLook = !seen.includes('vaisseau.console.premiere');
    if (firstLook) seen.push('vaisseau.console.premiere');
    if (result === 'close') {
      // Fermee sans choisir : le heros retient le signal (une fois) ; la console reste disponible.
      if (!seen.includes('vaisseau.console.hesitation')) {
        seen.push('vaisseau.console.hesitation');
        if (firstLook) await this.say('vaisseau.console.premiere');
        await this.say('vaisseau.console.hesitation');
      }
      return;
    }
    this.s3.step = 'signal';
    Sfx.powerUp();
    await this.openConsole('confirmation');
    if (firstLook) await this.say('vaisseau.console.premiere');
    await this.say('vaisseau.console.signal_suivi');
    this.hint(indication('objectif_sablier'), 3500);
  }

  // Sortie apres la panne : la porte s'ouvre, fondu vers la foret.
  private exitToForest(def: InteractableDef): void {
    this.inCutscene = true;
    controls.locked = true;
    this.gestureToward(def.x);
    this.door.play(() => this.travel('foret', 'porte_temps'));
  }

  // --- Sequences ---------------------------------------------------------------------------

  // Arrivee (fin de la scene 2) : noir complet une fois la porte refermee, puis allumage progressif avec quelques
  // clignotements, ecrans (la camera glisse jusqu'a la console et revient), courte reaction, objectif.
  private async arrival(): Promise<void> {
    this.player.setFacing(1);
    await this.wait(500);
    Sfx.doorClose();
    this.tweens.add({ targets: this.doorLight, alpha: 0, duration: 1500, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.dark, alpha: 0.96, duration: 1500 });
    await this.door.close(1500);
    await this.wait(1000);

    // Relais qui claquent, lumieres qui hesitent puis tiennent.
    const steps: [number, number, boolean][] = [
      [0.62, 70, true],
      [0.95, 130, false],
      [0.95, 420, false],
      [0.5, 60, true],
      [0.88, 110, false],
      [0.42, 80, false],
      [0.8, 260, false],
      [0.8, 250, false],
      [0.28, 650, true],
      [0.55, 90, false],
      [0, 1000, false],
    ];
    for (const [alpha, duration, click] of steps) {
      if (click) Sfx.click();
      await this.tweenTo(this.dark, alpha, duration);
      if (this.effects) this.effects.lights.setAlpha(1 - alpha);
    }
    if (this.effects) this.effects.lights.setAlpha(1);
    this.hum.set(0.25);

    await this.wait(300);
    await this.powerUp('ecran_mural');
    const desk = props.find((p) => p.id === CONSOLE_ID);
    if (desk) {
      await this.panCamera(desk.x * sx, 1600);
      await this.powerUp('console');
      await this.wait(500);
      await this.panCamera(null, 1300);
    }
    await this.wait(200);
    await this.say('vaisseau.arrivee');
    gameState.story.scene02.vaisseauReached = true;
    this.hint(indication('objectif_vaisseau'), 3500);
  }

  // Activation du sablier temporel : montee en puissance (lumiere, energie, vibrations, son), puis defaillance
  // brutale et panne. Effets mesures : aucun flash blanc plein ecran.
  private async activateHourglass(): Promise<void> {
    const [ax, ay] = HOURGLASS_CORE;
    const cx = ax * sx;
    const cy = ay * sy;
    this.gestureToward(cx);
    await this.say('vaisseau.sablier.activation');

    // Lumiere du sablier et flux d'energie qui monte le long de la colonne.
    const size = 230 * propScale;
    const halo = this.add.image(cx, cy, 'fx-glow').setDisplaySize(size * 4, size * 4).setTint(CYAN).setBlendMode(Phaser.BlendModes.ADD).setDepth(42).setAlpha(0);
    const core = this.add.image(cx, cy, 'fx-glow').setDisplaySize(size * 1.6, size * 1.6).setTint(0xbff4ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(42).setAlpha(0);
    const stream = this.add
      .particles(cx, 960 * sy, 'fx-mote', {
        x: { min: -60 * sx, max: 60 * sx },
        lifespan: { min: 900, max: 1400 },
        speedY: { min: -260 * sy, max: -160 * sy },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.9 * propScale + 0.3, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        tint: [CYAN, 0xbff4ff],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 120,
      })
      .setDepth(43);

    const RAMP = 4600;
    Sfx.spinUp(RAMP / 1000);
    this.hum.set(0.3);
    this.tweens.add({ targets: halo, alpha: 0.55, scale: halo.scale * 1.25, duration: RAMP, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: core, alpha: 0.7, scale: core.scale * 1.35, duration: RAMP, ease: 'Quad.easeIn' });
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: RAMP,
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        this.hum.set(0.3 + 0.7 * v);
        this.hum.setPitch(1 + 1.4 * v);
        stream.frequency = 120 - 95 * v;
      },
    });
    // Ecrans et lumieres du vaisseau qui reagissent, vibrations qui s'amplifient.
    const flickers: Phaser.Tweens.Tween[] = [];
    if (this.effects) {
      for (const glows of Object.values(this.effects.screens))
        flickers.push(this.tweens.add({ targets: glows, alpha: { from: 1, to: 0.35 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 380 }));
      flickers.push(this.tweens.add({ targets: this.effects.lights, alpha: { from: 1, to: 0.5 }, duration: 220, yoyo: true, repeat: -1, repeatDelay: 260 }));
    }
    const shakes = this.time.addEvent({
      delay: 380,
      repeat: Math.floor(RAMP / 380) - 1,
      callback: () => this.cameras.main.shake(340, 0.0008 + 0.0045 * (shakes.getOverallProgress() ?? 0)),
    });
    await this.wait(RAMP);

    // Defaillance : choc, la lumiere du sablier s'effondre, l'eclairage meurt en hoquetant.
    for (const f of flickers) f.stop();
    shakes.remove();
    Sfx.failure();
    this.cameras.main.shake(700, 0.01);
    this.hum.set(0);
    this.hum.setPitch(1);
    stream.stop();
    this.tweens.add({ targets: core, alpha: 0, duration: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: halo, alpha: 0, duration: 900, ease: 'Quad.easeOut' });
    this.applyBreakdown(true);
    const screens = [...this.screensOff.values()];
    this.tweens.chain({ targets: screens, tweens: [{ alpha: 1, duration: 60 }, { alpha: 0.3, duration: 90 }, { alpha: 1, duration: 120 }] });
    for (const [alpha, duration] of [
      [0.35, 80],
      [0.05, 120],
      [0.5, 90],
      [0.2, 160],
      [DARK.broken, 600],
    ] as [number, number][])
      await this.tweenTo(this.dark, alpha, duration);
    this.s3.step = 'breakdown';
    this.time.delayedCall(1500, () => {
      halo.destroy();
      core.destroy();
      stream.destroy();
    });

    await this.wait(900);
    await this.say('vaisseau.panne.alerte');
    await this.wait(400);
    await this.say('vaisseau.panne.reaction');
    this.hint(indication('objectif_sortir'), 3500);
  }

  // L'ecran clignote puis reste allume ; ses halos s'allument avec lui.
  private powerUp(id: ScreenId): Promise<void> {
    Sfx.powerUp();
    const glows = this.effects?.screens[id];
    if (glows) this.tweens.add({ targets: glows, alpha: 1, duration: 900, delay: 300 });
    const overlay = this.screensOff.get(id);
    if (!overlay || overlay.alpha === 0) return this.wait(900);
    return new Promise((resolve) => {
      this.tweens.chain({
        targets: overlay,
        tweens: [
          { alpha: 0.35, duration: 90 },
          { alpha: 0.9, duration: 120 },
          { alpha: 0.2, duration: 90 },
          { alpha: 0.7, duration: 160 },
          { alpha: 0, duration: 450, ease: 'Sine.easeOut' },
        ],
        onComplete: () => resolve(),
      });
    });
  }

  private tweenTo(target: Phaser.GameObjects.GameObject, alpha: number, duration: number): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, alpha, duration, onComplete: () => resolve() }));
  }

  private tintTo(image: Phaser.GameObjects.Image, color: number, duration: number): void {
    const from = Phaser.Display.Color.ValueToColor(0xffffff);
    const to = Phaser.Display.Color.ValueToColor(color);
    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() ?? 0);
        image.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    });
  }

  // Calque des ecrans eteints, pose exactement sur l'equipement. Il ne contient QUE les pixels d'ecran assombris
  // (le reste est transparent) : la plante voisine, dessinee au-dessus, n'est jamais masquee ni ne clignote.
  private screenOverlay(prop: Phaser.GameObjects.Image, id: ScreenId): Phaser.GameObjects.Image {
    const key = `vaisseau:${id}:eteint`;
    if (!this.textures.exists(key)) {
      const src = prop.texture.getSourceImage() as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = src.width;
      canvas.height = src.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(src, 0, 0);
      const source = ctx.getImageData(0, 0, src.width, src.height);
      const out = ctx.createImageData(src.width, src.height);
      const d = source.data;
      const o = out.data;
      for (const [x0, y0, x1, y1] of SCREENS[id]) {
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * src.width + x) * 4;
            const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
            if (a > 0 && (b > r + 12 || r + g + b > 540)) {
              o[i] = r * 0.1 + 6;
              o[i + 1] = g * 0.1 + 8;
              o[i + 2] = b * 0.14 + 14;
              o[i + 3] = a;
            }
          }
        }
      }
      ctx.clearRect(0, 0, src.width, src.height);
      ctx.putImageData(out, 0, 0);
      this.textures.addCanvas(key, canvas)?.setFilter(prop.texture.source[0].scaleMode === Phaser.ScaleModes.LINEAR ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.textures.exists(key) && this.textures.remove(key));
    }
    return this.add
      .image(prop.x, prop.y, key)
      .setOrigin(prop.originX, prop.originY)
      .setScale(prop.scaleX, prop.scaleY)
      .setDepth(prop.depth) // meme profondeur que l'equipement, ajoute juste apres : au-dessus de lui, sous la plante
      .setScrollFactor(prop.scrollFactorX, prop.scrollFactorY);
  }
}
