import Phaser from 'phaser';
import type { DialogueLine } from '@/systems/Dialogue';
import { FRAME_SLICES, PLATE_SLICES, resizeNineSlice as resize, uiNineSlice } from './NineSlice';
import { uiImage } from './UiImage';
import { textStyle, UiColors } from './UiStyle';

const PAD = { left: 18, right: 18, top: 14, bottom: 12 }; // marge interieure du cadre
const PORTRAIT_SIZE = 76;
const NAME = { size: 14, padX: 8, padY: 3, maxWidthRatio: 0.6 };
const BODY = { size: 16, lineSpacing: 1 };
const BUTTON = { height: 28, padX: 14, size: 15 };
const MOTIF_HEIGHT = 50;
const THOUGHT_COLOR = '#a9cdf5'; // pensees du heros

// Boite de dialogue affichee dans le panneau bas, a la place des commandes.
// Nom et texte s'adaptent au contenu ; un texte trop long est decoupe en pages.
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly portraitFrame: Phaser.GameObjects.Image;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly motif: Phaser.GameObjects.Image;
  private readonly plate: Phaser.GameObjects.NineSlice;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly button: Phaser.GameObjects.Container;
  private readonly buttonPlate: Phaser.GameObjects.NineSlice;
  private readonly buttonLabel: Phaser.GameObjects.Text;
  private readonly lineHeight: number;

  private lines: DialogueLine[] = [];
  private index = 0;
  private pages: string[] = [];
  private page = 0;
  private openedAt = 0;

  // area : zone disponible (le panneau bas, marges comprises).
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly area: Phaser.Geom.Rectangle,
    private readonly onClose: () => void,
  ) {
    this.frame = uiNineSlice(scene, 'dialogue_frame', FRAME_SLICES);
    this.frame.setInteractive().on('pointerdown', () => this.advance());
    this.motif = uiImage(scene, 'dialogue_motif', 0, 0).setOrigin(1, 1).setAlpha(0.85);
    this.motif.setScale((this.motif.scaleX * MOTIF_HEIGHT) / this.motif.displayHeight);
    this.portraitFrame = uiImage(scene, 'dialogue_portrait', 0, 0).setOrigin(0);
    this.portraitFrame.setScale((this.portraitFrame.scaleX * PORTRAIT_SIZE) / this.portraitFrame.displayWidth);
    this.portrait = scene.add.image(0, 0, '__DEFAULT').setVisible(false);

    this.plate = uiNineSlice(scene, 'dialogue_nameplate', PLATE_SLICES);
    this.speaker = scene.add.text(0, 0, '', { ...textStyle(NAME.size, UiColors.gold), align: 'center' }).setOrigin(0.5);
    this.body = scene.add.text(0, 0, '', { ...textStyle(BODY.size), lineSpacing: BODY.lineSpacing });
    this.lineHeight = this.body.setText('Ag').height + BODY.lineSpacing;

    this.buttonPlate = uiNineSlice(scene, 'dialogue_nameplate', PLATE_SLICES);
    this.buttonLabel = scene.add.text(0, 0, '', textStyle(BUTTON.size, UiColors.gold)).setOrigin(0.5);
    this.button = scene.add.container(0, 0, [this.buttonPlate, this.buttonLabel]);
    this.buttonPlate.setInteractive().on('pointerdown', () => this.advance());

    this.root = scene.add
      .container(0, 0, [this.frame, this.motif, this.portraitFrame, this.portrait, this.plate, this.speaker, this.body, this.button])
      .setVisible(false)
      .setDepth(100);
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
    this.showLine();
  }

  // Ferme la boite d'un coup (bouton de fermeture de l'examen d'une oeuvre).
  close(): void {
    if (!this.isOpen) return;
    this.root.setVisible(false);
    this.onClose();
  }

  advance(): void {
    // Ignore le tap qui vient d'ouvrir la boite.
    if (!this.isOpen || this.scene.time.now - this.openedAt < 150) return;
    if (this.page + 1 < this.pages.length) {
      this.page++;
      this.showPage();
    } else if (this.index + 1 < this.lines.length) {
      this.index++;
      this.showLine();
    } else {
      this.root.setVisible(false);
      this.onClose();
    }
  }

  // Met en page la replique courante et la decoupe en pages selon la place disponible.
  private showLine(): void {
    const line = this.lines[this.index];
    const { x, y, width } = this.area;

    // Bouton en bas a droite du panneau ; le cadre prend toute la hauteur restante au maximum.
    const buttonTop = this.area.bottom - BUTTON.height;
    const maxFrameHeight = buttonTop - 8 - y;
    const inner = { left: x + PAD.left, top: y + PAD.top, right: x + width - PAD.right };

    // Portrait : affiche seulement s'il est fourni ; sinon son espace revient au texte.
    const hasPortrait = Boolean(line.portrait && this.scene.textures.exists(line.portrait));
    this.portraitFrame.setVisible(hasPortrait);
    this.portrait.setVisible(hasPortrait);
    let textLeft = inner.left;
    if (hasPortrait) {
      this.portraitFrame.setPosition(inner.left, inner.top);
      const tex = this.scene.textures.get(line.portrait!).getSourceImage();
      const room = PORTRAIT_SIZE - 12;
      this.portrait
        .setTexture(line.portrait!)
        .setScale(Math.min(room / tex.width, room / tex.height))
        .setPosition(inner.left + PORTRAIT_SIZE / 2, inner.top + this.portraitFrame.displayHeight / 2);
      textLeft = inner.left + PORTRAIT_SIZE + 10;
    }
    const textWidth = inner.right - textLeft;

    // Cartouche du nom : largeur ajustee au texte, bornee ; au-dela, le nom passe a la ligne.
    let nameBottom = inner.top;
    const hasName = Boolean(line.speaker);
    this.plate.setVisible(hasName);
    this.speaker.setVisible(hasName);
    if (hasName) {
      const maxInner = textWidth * NAME.maxWidthRatio - NAME.padX * 2;
      this.speaker.setWordWrapWidth(null).setText(line.speaker!);
      if (this.speaker.width > maxInner) this.speaker.setWordWrapWidth(maxInner, true);
      const plateW = Math.max(56, this.speaker.width + NAME.padX * 2);
      const plateH = Math.max(20, this.speaker.height + NAME.padY * 2);
      this.plate.setPosition(textLeft, inner.top);
      resize(this.plate, plateW, plateH);
      this.speaker.setPosition(textLeft + plateW / 2, inner.top + plateH / 2);
      nameBottom = inner.top + plateH + 6;
    }

    // Corps : retour a la ligne, le motif celeste garde sa place en bas a droite.
    this.body.setColor(line.thought ? THOUGHT_COLOR : UiColors.text);
    this.speaker.setColor(line.thought ? THOUGHT_COLOR : UiColors.gold);
    const wrapWidth = textWidth - this.motif.displayWidth * 0.75;
    this.body.setPosition(textLeft, nameBottom).setWordWrapWidth(wrapWidth, true);
    const wrapped = this.body.getWrappedText(line.text);
    const bottomLimit = y + maxFrameHeight - PAD.bottom;
    const linesPerPage = Math.max(1, Math.floor((bottomLimit - nameBottom) / this.lineHeight));
    this.pages = [];
    for (let i = 0; i < wrapped.length; i += linesPerPage) this.pages.push(wrapped.slice(i, i + linesPerPage).join('\n'));
    if (this.pages.length === 0) this.pages.push('');
    this.page = 0;

    // Hauteur du cadre : juste ce qu'il faut pour la page la plus longue (et le portrait).
    const usedLines = Math.min(wrapped.length, linesPerPage);
    const contentBottom = Math.max(nameBottom + usedLines * this.lineHeight, hasPortrait ? inner.top + this.portraitFrame.displayHeight : 0);
    const frameHeight = Phaser.Math.Clamp(contentBottom + PAD.bottom - y, 64, maxFrameHeight);
    this.frame.setPosition(x, y);
    resize(this.frame, width, frameHeight);
    this.motif.setPosition(x + width - 12, y + frameHeight - 8);

    this.showPage();
  }

  private showPage(): void {
    this.body.setText(this.pages[this.page]);
    const last = this.page + 1 >= this.pages.length && this.index + 1 >= this.lines.length;
    this.buttonLabel.setText(last ? 'Fermer' : 'Continuer');
    const w = this.buttonLabel.width + BUTTON.padX * 2;
    resize(this.buttonPlate, w, BUTTON.height);
    this.buttonPlate.setPosition(-w, -BUTTON.height);
    this.buttonLabel.setPosition(-w / 2, -BUTTON.height / 2);
    this.button.setPosition(this.area.right, this.area.bottom);
  }
}
