import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { DOOR_ID, layers, porteGeo, porteMirrored, propScale, props, sx, sy, textureKey, vaisseau } from '@/data/rooms/vaisseau';
import { Door } from '@/entities/Door';
import { indication } from '@/systems/Dialogues';
import { gameState } from '@/systems/GameState';
import { getSettings } from '@/systems/SaveGame';
import { Sfx } from '@/systems/Sfx';
import type { InteractableDef } from '@/world/RoomDefinition';
import { addVaisseauEffects, type ScreenId, type VaisseauEffects } from './vaisseauEffects';
import { RoomScene } from './RoomScene';

// Ecrans eteints avant l'arrivee du heros : rectangles des ecrans dans les images des equipements (pixels de
// texture). Dans ces zones, les pixels bleutes ou tres clairs sont assombris ; le cadre des ecrans ne change pas.
const SCREENS: Record<ScreenId, [number, number, number, number][]> = {
  console: [
    [36, 30, 114, 112],
    [140, 8, 456, 120],
    [470, 32, 556, 112],
  ],
  ecran_mural: [[6, 16, 66, 160]],
};

// Salle du vaisseau : assemble les panneaux du pack (fond, structure, rebord, premier plan)
// et ses equipements, aux profondeurs prevues par scene.json. Le heros (50) passe devant les
// equipements (40) et derriere le rebord (60) et les angles proches (70).
// Scene 2 : a la premiere arrivee par la porte (depuis la ruelle), la porte se referme et les deux consoles
// (console et ecran mural) s'allument.
export class VaisseauScene extends RoomScene {
  protected readonly room = vaisseau;
  private door!: Door;
  private effects: VaisseauEffects | null = null;
  private screensOff = new Map<ScreenId, Phaser.GameObjects.Image>();
  private awakening = false;

  constructor() {
    super(SceneKeys.Vaisseau);
  }

  create(): void {
    const story = gameState.story;
    // Premiere arrivee par la porte de la ruelle : le vaisseau est encore eteint.
    this.awakening = this.arrivalDoor === DOOR_ID && story.scene02.doorOpened && !story.scene02.vaisseauReached;
    this.screensOff = new Map();
    this.effects = null;
    super.create();
    if (this.awakening) this.runCutscene(() => this.arrival(), 500);
  }

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

    for (const prop of props) {
      const image = this.add
        .image(prop.x * sx, prop.y * sy, textureKey(prop.file))
        .setOrigin(prop.origin[0], prop.origin[1])
        .setScale(propScale)
        .setDepth(prop.depth)
        .setScrollFactor(prop.scrollFactor);
      const id = prop.id as ScreenId;
      if (this.awakening && SCREENS[id]) this.screensOff.set(id, this.screenOverlay(image, id));
    }

    this.door = new Door(this, porteGeo, porteMirrored);
    this.doors.set(DOOR_ID, this.door);
    if (this.awakening) this.door.setOpen();

    if (getSettings().ambient) this.effects = addVaisseauEffects(this);
    if (this.awakening && this.effects) for (const glows of Object.values(this.effects.screens)) glows.setAlpha(0);
  }

  protected onInteract(def: InteractableDef): void {
    if (this.inCutscene) return;
    // Apres l'arrivee, la porte reste close : l'objectif est d'explorer le vaisseau.
    if (def.id === DOOR_ID && gameState.story.scene02.vaisseauReached) {
      this.runCutscene(() => this.say('vaisseau.porte'));
      return;
    }
    super.onInteract(def);
  }

  // Arrivee : la porte se referme doucement, l'ecran mural puis la console s'allument (la camera glisse jusqu'a
  // elle et revient), courte reaction, puis objectif.
  private async arrival(): Promise<void> {
    this.player.setFacing(1);
    await this.wait(500);
    Sfx.doorClose();
    await this.door.close(1500);
    await this.wait(400);
    await this.powerUp('ecran_mural');
    const desk = props.find((p) => p.id === 'console');
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

  // L'ecran clignote puis reste allume ; ses halos s'allument avec lui.
  private powerUp(id: ScreenId): Promise<void> {
    Sfx.powerUp();
    const glows = this.effects?.screens[id];
    if (glows) this.tweens.add({ targets: glows, alpha: 1, duration: 900, delay: 300 });
    const overlay = this.screensOff.get(id);
    if (!overlay) return this.wait(900);
    this.screensOff.delete(id);
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
        onComplete: () => {
          overlay.destroy();
          resolve();
        },
      });
    });
  }

  // Copie de l'equipement avec ses ecrans eteints, posee exactement par-dessus.
  private screenOverlay(prop: Phaser.GameObjects.Image, id: ScreenId): Phaser.GameObjects.Image {
    const key = `vaisseau:${id}:eteint`;
    if (!this.textures.exists(key)) {
      const src = prop.texture.getSourceImage() as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = src.width;
      canvas.height = src.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(src, 0, 0);
      for (const [x0, y0, x1, y1] of SCREENS[id]) {
        const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
          if (d[i + 3] > 0 && (b > r + 12 || r + g + b > 540)) {
            d[i] = r * 0.1 + 6;
            d[i + 1] = g * 0.1 + 8;
            d[i + 2] = b * 0.14 + 14;
          }
        }
        ctx.putImageData(img, x0, y0);
      }
      // Seuls les pixels modifies servent : le reste est identique a l'image d'origine.
      this.textures.addCanvas(key, canvas)?.setFilter(prop.texture.source[0].scaleMode === Phaser.ScaleModes.LINEAR ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.textures.exists(key) && this.textures.remove(key));
    }
    return this.add
      .image(prop.x, prop.y, key)
      .setOrigin(prop.originX, prop.originY)
      .setScale(prop.scaleX, prop.scaleY)
      .setDepth(prop.depth + 2) // au-dessus des halos des ecrans
      .setScrollFactor(prop.scrollFactorX, prop.scrollFactorY);
  }
}
