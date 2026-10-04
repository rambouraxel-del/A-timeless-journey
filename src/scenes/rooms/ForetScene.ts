import Phaser from 'phaser';
import { GAME_VIEW } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { DISCOVERY_STEPS, DOOR_ID, doorGeo, FOREST_IMAGE, foret, groundY, roomWidth } from '@/data/rooms/foret';
import { Door } from '@/entities/Door';
import { controls } from '@/systems/Controls';
import { indication } from '@/systems/Dialogues';
import { gameState } from '@/systems/GameState';
import { reached } from '@/systems/SaveGame';
import { Sfx } from '@/systems/Sfx';
import type { InteractableDef } from '@/world/RoomDefinition';
import { RoomScene } from './RoomScene';

// Foret (fin de la scene 3, prototype) : le heros sort du vaisseau et decouvre une foret a la place de la ruelle.
// La porte du vaisseau se tient seule au milieu des arbres et ramene au vaisseau en panne.
// Decor provisoire dessine ici (drawPlaceholder) ; le vrai fond se branche via FOREST_IMAGE (src/data/rooms/foret.ts).
export class ForetScene extends RoomScene {
  protected readonly room = foret;
  private door!: Door;
  private arrivalX = 0;
  private discovering = false;

  constructor() {
    super(SceneKeys.Foret);
  }

  preload(): void {
    if (FOREST_IMAGE && !this.textures.exists(FOREST_IMAGE.key)) this.load.image(FOREST_IMAGE.key, FOREST_IMAGE.url);
  }

  create(): void {
    super.create();
    const s3 = gameState.story.scene03;
    this.arrivalX = this.player.position.x;
    // Tant que la foret n'est pas decouverte (etape breakdown), quelques pas declenchent la reaction du heros.
    // Premiere sortie du vaisseau : la porte se referme derriere lui, puis il peut avancer.
    this.discovering = s3.step === 'breakdown';
    if (this.discovering && this.arrivalDoor === DOOR_ID) {
      this.door.setOpen();
      this.runCutscene(async () => {
        await this.wait(500);
        Sfx.doorClose();
        await this.door.close(1300);
        await this.say('foret.arrivee');
      }, 300);
    } else if (reached(s3, 'forest')) {
      this.hint(indication('fin_prototype'), 3000);
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    // Quelques pas loin de la porte : la decouverte (une seule fois, sauvegardee).
    if (this.discovering && !controls.locked && !this.inCutscene && Math.abs(this.player.position.x - this.arrivalX) > DISCOVERY_STEPS) {
      this.discovering = false;
      this.runCutscene(async () => {
        await this.say('foret.decouverte');
        gameState.story.scene03.step = 'forest';
        this.hint(indication('fin_prototype'), 4000);
      });
    }
  }

  protected buildScenery(): void {
    if (FOREST_IMAGE && this.textures.exists(FOREST_IMAGE.key)) this.drawImage(FOREST_IMAGE.key);
    else this.drawPlaceholder();
    this.door = new Door(this, doorGeo, false);
    this.doors.set(DOOR_ID, this.door);
  }

  protected onInteract(def: InteractableDef): void {
    if (this.inCutscene) return;
    // Avant la decouverte, la porte ne ramene pas tout de suite au vaisseau : courte remarque.
    if (def.id === DOOR_ID && this.discovering) {
      this.runCutscene(() => this.say('foret.porte'));
      return;
    }
    super.onInteract(def); // porte : retour au vaisseau (connections.ts)
  }

  // Vrai fond fourni : image couvrant la hauteur de la vue, defilant avec la salle.
  private drawImage(key: string): void {
    const src = this.textures.get(key).getSourceImage();
    const scale = GAME_VIEW.height / src.height;
    this.add.image(0, 0, key).setOrigin(0).setScale(scale).setDepth(0);
  }

  // --- Decor provisoire (a remplacer) ----------------------------------------------------------
  // Ciel du matin, deux rangees d'arbres lointains en parallaxe, sol herbeux, quelques troncs au premier plan.
  private drawPlaceholder(): void {
    const W = GAME_VIEW.width;
    const H = GAME_VIEW.height;
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    sky.fillGradientStyle(0x8fcbe0, 0x8fcbe0, 0xf1e4bf, 0xf1e4bf, 1).fillRect(0, 0, W, H);

    const rng = new Phaser.Math.RandomDataGenerator(['foret']);
    const pines = (factor: number, depth: number, color: number, base: number, minH: number, maxH: number, step: number) => {
      const g = this.add.graphics().setScrollFactor(factor).setDepth(depth);
      g.fillStyle(color, 1);
      const width = W + (roomWidth - W) * factor + step;
      for (let x = -step; x < width; x += step * rng.realInRange(0.6, 1.1)) {
        const h = rng.between(minH, maxH);
        const w = h * 0.42;
        g.fillTriangle(x, base, x + w / 2, base - h, x + w, base);
        g.fillTriangle(x + w * 0.1, base - h * 0.35, x + w / 2, base - h * 1.05, x + w * 0.9, base - h * 0.35);
      }
      g.fillRect(-step, base, width + step, H - base);
    };
    pines(0.25, 2, 0x6f9a9a, groundY - H * 0.12, H * 0.25, H * 0.42, W * 0.09);
    pines(0.55, 4, 0x3f6e5a, groundY - H * 0.05, H * 0.35, H * 0.6, W * 0.12);

    const ground = this.add.graphics().setDepth(10);
    ground.fillStyle(0x4f7a3a, 1).fillRect(0, groundY - 6, roomWidth, H - groundY + 6);
    ground.fillStyle(0x6b5233, 1).fillRect(0, groundY + 10, roomWidth, H - groundY - 10);
    ground.fillStyle(0x5f8f43, 1);
    for (let x = 0; x < roomWidth; x += rng.between(6, 14)) ground.fillRect(x, groundY - 6 - rng.between(2, 6), 2, rng.between(3, 7));

    // Rayons de lumiere entre les arbres.
    const rays = this.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    rays.fillStyle(0xfff2c8, 0.07);
    for (let x = W * 0.2; x < roomWidth; x += W * rng.realInRange(0.6, 1)) rays.fillTriangle(x, 0, x + W * 0.12, 0, x + W * 0.32, groundY);

    // Troncs au premier plan (devant le heros), loin de la porte.
    const trunks = this.add.graphics().setDepth(60);
    for (const fx of [0.05, 1.25, 1.9, 2.55]) {
      const x = W * fx;
      trunks.fillStyle(0x2e2418, 1).fillRect(x, 0, W * 0.07, H);
      trunks.fillStyle(0x3d3020, 1).fillRect(x + W * 0.012, 0, W * 0.015, H);
    }
  }
}
