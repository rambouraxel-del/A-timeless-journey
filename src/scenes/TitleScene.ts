import Phaser from 'phaser';
import { Assets, UiFont, UiTextureKeys } from '@/config/Assets';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE, UI_DENSITY } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { layers, props, textureKey, textureUrl } from '@/data/rooms/vaisseau';
import { roomSceneKey } from '@/data/rooms/registry';
import { NPCS } from '@/data/rooms/musee-pnj';
import { ARTWORKS, MYSTERIOUS, npcKey, npcUrl, partKey, partUrl, PARTS, thumbKey, thumbUrl } from '@/data/rooms/musee';
import { DOOR_TEXTURES } from '@/data/rooms/portes';
import { gameState, startGameState } from '@/systems/GameState';
import { Music } from '@/systems/Music';
import { hasAnySave, loadSlot, setActiveSlot } from '@/systems/SaveGame';
import { Modal } from '@/ui/Modal';
import { openSettings, openSlotPicker } from '@/ui/SaveMenus';
import { useLogicalCamera } from '@/ui/UiImage';

// Fond commun (852 x 1846) : le heros est en bas a droite, ses pieds a 76 % de la hauteur.
const BG = { width: 852, height: 1846, heroFeetY: 1405 };
const TITLE_ASPECT = 678 / 1100;
const BUTTON_RATIOS = { continuer: 198 / 1000, nouvelle: 185 / 1000, parametres: 221 / 1000 };
const GOLD = 0xf2c46b;

// Ecran titre : chargement reel des ressources (barre doree), puis menu.
export class TitleScene extends Phaser.Scene {
  private loaded = false;
  private bar!: Phaser.GameObjects.Container;
  private barFill!: Phaser.GameObjects.Rectangle;
  private barShine!: Phaser.GameObjects.Rectangle;
  private barWidth = 0;
  private buttonsBox = { top: 0, width: 0 };
  private continueButton!: Phaser.GameObjects.Image;
  private starting = false;

  constructor() {
    super(SceneKeys.Title);
  }

  // data.loaded : les ressources sont deja en memoire (retour au menu depuis le jeu).
  init(data?: { loaded?: boolean }): void {
    this.loaded = data?.loaded === true;
    this.starting = false;
  }

  create(): void {
    Music.play('theme'); // theme principal : tente des l'ouverture, sinon au premier toucher (audio bloque par le navigateur)
    useLogicalCamera(this, RENDER_SCALE);
    const heroFeet = this.createBackground();
    this.createTitle();
    this.computeButtonsBox(heroFeet);
    this.createBar();
    if (this.loaded) this.showMenu();
    else this.startLoading();
  }

  // --- Fond, titre --------------------------------------------------------------

  // Fond en "cover" sans deformation, aligne en bas (le heros reste au-dessus des boutons).
  // Retourne la position ecran des pieds du heros.
  private createBackground(): number {
    const scale = Math.max(LOGICAL_WIDTH / BG.width, LOGICAL_HEIGHT / BG.height);
    const image = this.add.image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT, 'menu_fond').setOrigin(0.5, 1).setScale(scale);
    return image.y - BG.height * scale + BG.heroFeetY * scale;
  }

  private createTitle(): void {
    const width = Math.min(LOGICAL_WIDTH * 0.82, (LOGICAL_HEIGHT * 0.24) / TITLE_ASPECT);
    const title = this.add.image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.045, 'menu_titre').setOrigin(0.5, 0);
    title.setScale(width / title.width);
  }

  // Zone des boutons : sous les pieds du heros, sans le recouvrir.
  private computeButtonsBox(heroFeet: number): void {
    const gap = 8;
    const ratioSum = BUTTON_RATIOS.continuer + BUTTON_RATIOS.nouvelle + BUTTON_RATIOS.parametres;
    const bottom = LOGICAL_HEIGHT - Math.max(14, LOGICAL_HEIGHT * 0.03);
    const room = bottom - (heroFeet + 8) - gap * 2;
    const width = Math.min(LOGICAL_WIDTH * 0.7, 270, room / ratioSum);
    this.buttonsBox = { width, top: bottom - (width * ratioSum + gap * 2) };
  }

  // --- Barre de chargement ------------------------------------------------------

  private createBar(): void {
    const w = Math.min(LOGICAL_WIDTH * 0.6, 240);
    const h = 12;
    this.barWidth = w - 6;
    const y = LOGICAL_HEIGHT - Math.max(48, LOGICAL_HEIGHT * 0.075);
    const frame = this.add.rectangle(0, 0, w, h, 0x120c04, 0.72).setStrokeStyle(2, GOLD, 1);
    const trackLeft = -this.barWidth / 2;
    this.barFill = this.add.rectangle(trackLeft, 0, 0, h - 6, GOLD).setOrigin(0, 0.5);
    this.barShine = this.add.rectangle(trackLeft, -(h - 6) / 4, 0, 1.5, 0xfff2c8, 0.9).setOrigin(0, 0.5);
    this.bar = this.add.container(LOGICAL_WIDTH / 2, y, [frame, this.barFill, this.barShine]);
  }

  private setProgress(value: number): void {
    const width = this.barWidth * Phaser.Math.Clamp(value, 0, 1);
    this.barFill.width = width;
    this.barShine.width = width;
  }

  private startLoading(): void {
    this.setProgress(0);
    const failed: string[] = [];
    const { hero } = Assets;
    this.load.on('progress', (value: number) => this.setProgress(value));
    this.load.on('loaderror', (file: Phaser.Loader.File) => failed.push(file.src));
    this.load.spritesheet(hero.key, hero.url, { frameWidth: hero.frameWidth, frameHeight: hero.frameHeight });
    for (const key of UiTextureKeys) this.load.image(key, `assets/ui/x${UI_DENSITY}/${key}.png`);
    this.load.font(UiFont.family, UiFont.url);
    for (const t of DOOR_TEXTURES) this.load.image(t.key, t.url);
    for (const part of PARTS) this.load.image(partKey(part.file), partUrl(part.file));
    for (const npc of NPCS) this.load.image(npcKey(npc), npcUrl(npc));
    this.load.image(MYSTERIOUS.key, MYSTERIOUS.url);
    for (const art of ARTWORKS) this.load.image(thumbKey(art.id), thumbUrl(art.id));
    for (const item of [...layers, ...props]) this.load.image(textureKey(item.file), textureUrl(item.file));
    this.load.once('complete', () => {
      if (failed.length > 0) {
        console.error('Ressources introuvables :', failed);
        this.showLoadError();
        return;
      }
      // Interface haute definition : lissage bilineaire (le mode pixel-art serait crenele).
      for (const key of UiTextureKeys) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.setProgress(1);
      this.time.delayedCall(250, () => this.showMenu());
    });
    this.load.start();
  }

  private showLoadError(): void {
    this.bar.destroy();
    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 60, 'Chargement impossible.\nRecharge la page.', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#f2c46b',
        align: 'center',
        backgroundColor: '#120c04cc',
        padding: { x: 10, y: 6 },
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5);
  }

  // --- Menu ---------------------------------------------------------------------

  // La barre disparait, puis les trois boutons apparaissent en montant legerement.
  private showMenu(): void {
    const finish = () => this.createButtons();
    if (this.loaded) {
      this.bar.setVisible(false);
      finish();
    } else {
      this.tweens.add({ targets: this.bar, alpha: 0, duration: 350, onComplete: () => { this.bar.setVisible(false); finish(); } });
    }
  }

  private createButtons(): void {
    const { width, top } = this.buttonsBox;
    const gap = 8;
    const specs = [
      { key: 'menu_btn_continuer', ratio: BUTTON_RATIOS.continuer, onTap: () => this.onContinue() },
      { key: 'menu_btn_nouvelle_partie', ratio: BUTTON_RATIOS.nouvelle, onTap: () => this.onNewGame() },
      { key: 'menu_btn_parametres', ratio: BUTTON_RATIOS.parametres, onTap: () => this.openSettings() },
    ];
    let y = top;
    specs.forEach((spec, i) => {
      const image = this.add.image(LOGICAL_WIDTH / 2, y + (width * spec.ratio) / 2, spec.key);
      image.setScale(width / image.width).setAlpha(0);
      const finalY = image.y;
      image.y = finalY + 14;
      // "Continuer" est grise et inactif sans sauvegarde.
      const enabled = i !== 0 || hasAnySave();
      if (i === 0) image.setTint(enabled ? 0xffffff : 0xa8a8a8).setData('enabled', enabled);
      this.tweens.add({ targets: image, alpha: enabled ? 1 : 0.6, y: finalY, duration: 520, delay: i * 130, ease: 'Cubic.easeOut' });
      image.setInteractive();
      const base = image.scale;
      image.on('pointerdown', () => image.setScale(base * 0.96));
      image.on('pointerout', () => image.setScale(base));
      image.on('pointerup', () => {
        image.setScale(base);
        if (!Modal.isOpen() && !this.starting) spec.onTap();
      });
      if (i === 0) this.continueButton = image;
      y += width * spec.ratio + gap;
    });
  }

  // Met a jour "Continuer" apres un changement de sauvegarde.
  private refreshContinue(): void {
    const enabled = hasAnySave();
    this.continueButton.setTint(enabled ? 0xffffff : 0xa8a8a8);
    this.continueButton.setData('enabled', enabled);
    const target = enabled ? 1 : 0.6;
    this.tweens.killTweensOf(this.continueButton);
    this.tweens.add({ targets: this.continueButton, alpha: target, duration: 200 });
  }

  private onContinue(): void {
    if (!this.continueButton.getData('enabled')) return;
    openSlotPicker(this, 'load', (slot) => this.startGame(slot, true));
  }

  private onNewGame(): void {
    openSlotPicker(this, 'new', (slot) => this.startGame(slot, false));
  }

  update(_time: number, delta: number): void {
    Music.update(delta / 1000);
  }

  private openSettings(): void {
    openSettings(this, { allowErase: true, onBack: () => this.refreshContinue(), onErased: () => this.refreshContinue() });
  }

  private startGame(slot: number, resume: boolean): void {
    if (this.starting) return;
    this.starting = true;
    setActiveSlot(slot);
    startGameState(resume ? loadSlot(slot) : null);
    Music.play(null); // fondu du theme (la mise a jour continue dans UIScene)
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(roomSceneKey(gameState.room), { resume });
      this.scene.launch(SceneKeys.UI);
    });
  }
}

