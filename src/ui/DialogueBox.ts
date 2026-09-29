import Phaser from 'phaser';
import type { DialogueLine } from '@/systems/Dialogue';
import { UiSizes } from '@/config/UiSizes.generated';
import { uiImage } from './UiImage';
import { textStyle, UiColors } from './UiStyle';

// Geometrie interne du cadre dialogue_box (340 x 82).
const PORTRAIT = { x: 6, y: 6, width: 78, height: 70 };
const NAMEPLATE = { x: 92, y: 5 };
const BODY = { x: 98, y: 27, wrap: 172 };

// Hauteur d'affichage d'une boite de largeur donnee.
export const dialogueHeight = (width: number): number => (UiSizes.dialogue_box.h * width) / 340;

// Boite de dialogue : portrait a gauche, cartouche du nom, texte. Un tap sur la boite
// (ou le bouton INTERAGIR) passe a la replique suivante.
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly nameplate: Phaser.GameObjects.Container;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private openedAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    private readonly onClose: () => void,
  ) {
    // Toute la boite est construite en largeur 340, puis agrandie d'un bloc a la largeur voulue.
    const f = width / 340;
    const box = uiImage(scene, 'dialogue_box', 0, 0).setOrigin(0);
    this.portrait = scene.add.image(PORTRAIT.x + PORTRAIT.width / 2, PORTRAIT.y + PORTRAIT.height / 2, '__DEFAULT').setVisible(false);
    const plate = uiImage(scene, 'dialogue_nameplate', 0, 0).setOrigin(0);
    this.speaker = scene.add.text(plate.displayWidth / 2, plate.displayHeight / 2, '', textStyle(13, UiColors.gold, f)).setOrigin(0.5);
    this.nameplate = scene.add.container(NAMEPLATE.x, NAMEPLATE.y, [plate, this.speaker]);
    this.body = scene.add.text(BODY.x, BODY.y, '', { ...textStyle(14, UiColors.text, f), wordWrap: { width: BODY.wrap }, lineSpacing: -2 });

    this.root = scene.add.container(x, y, [box, this.portrait, this.nameplate, this.body]).setScale(f).setVisible(false).setDepth(100);
    box.setInteractive().on('pointerdown', () => this.advance());
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  open(lines: DialogueLine[]): void {
    if (lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.openedAt = this.scene.time.now;
    this.root.setVisible(true);
    this.show();
  }

  advance(): void {
    // Ignore le tap qui vient d'ouvrir la boite.
    if (!this.isOpen || this.scene.time.now - this.openedAt < 150) return;
    this.index++;
    if (this.index < this.lines.length) this.show();
    else {
      this.root.setVisible(false);
      this.onClose();
    }
  }

  private show(): void {
    const line = this.lines[this.index];
    this.nameplate.setVisible(Boolean(line.speaker));
    this.speaker.setText(line.speaker ?? '');
    this.body.setText(line.text);
    if (line.portrait && this.scene.textures.exists(line.portrait)) {
      const tex = this.scene.textures.get(line.portrait).getSourceImage();
      const scale = Math.min(PORTRAIT.width / tex.width, PORTRAIT.height / tex.height);
      this.portrait.setTexture(line.portrait).setScale(scale).setVisible(true);
    } else this.portrait.setVisible(false);
  }
}
