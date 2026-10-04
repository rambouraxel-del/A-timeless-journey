import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/config/Layout';
import type { ConsoleScreen, ConsoleTone } from '@/systems/Dialogues';
import { TextButton } from './TextButton';
import { uiImage } from './UiImage';
import { textStyle, UiColors } from './UiStyle';

// Console du vaisseau : terminal plein ecran (lisible en portrait), lignes affichees une a une. Les textes viennent
// de scene03.fr.json (section "console"). Un toucher sur l'ecran affiche tout d'un coup.
const BACKDROP = 0x050910;
const SCREEN_FILL = 0x0a1622;
const BORDER = 0x38d8ff;
const MARGIN = 14;
const PAD = 14;
const TONES: Record<ConsoleTone, string> = {
  normal: '#bfefff',
  code: '#4f9fb6',
  date: '#e9d8a6',
  alerte: '#ffb35c',
  attenue: '#5d7c89',
};
const LINE_DELAY = 140; // ms entre deux lignes
const TEXT_SIZE = 20;
const LINE_GAP = 7;

export type ConsoleResult = 'action' | 'close';

export class ConsoleView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly action: TextButton;
  private readonly close: TextButton;
  private readonly screenRect: Phaser.Geom.Rectangle;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly corners: Phaser.GameObjects.Image[];
  private lines: Phaser.GameObjects.Text[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private flicker: Phaser.Tweens.Tween | null = null;
  private done: ((result: ConsoleResult) => void) | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const W = LOGICAL_WIDTH;
    const H = LOGICAL_HEIGHT;
    const backdrop = scene.add.rectangle(0, 0, W, H, BACKDROP, 0.97).setOrigin(0).setInteractive();
    backdrop.on('pointerdown', () => this.revealAll());

    // Ecran : cadre cyan, coins dores de l'interface, lignes de balayage discretes (dessines a l'ouverture,
    // a la hauteur du contenu ; l'ensemble est centre verticalement).
    this.screenRect = new Phaser.Geom.Rectangle(MARGIN, 0, W - MARGIN * 2, 0);
    this.frame = scene.add.graphics();
    this.corners = [0, 1, 2, 3].map((i) =>
      uiImage(scene, 'orn_corner', 0, 0)
        .setOrigin(i % 2, i < 2 ? 0 : 1)
        .setFlipX(i % 2 === 1)
        .setFlipY(i >= 2),
    );

    this.title = scene.add.text(W / 2, 0, '', { ...textStyle(20, UiColors.gold), align: 'center' }).setOrigin(0.5);
    this.body = scene.add.container(0, 0);

    const buttonW = Math.min(250, W - MARGIN * 4);
    this.action = new TextButton(scene, '', buttonW, 34, () => this.finish('action'));
    this.close = new TextButton(scene, '', Math.min(160, buttonW), 30, () => this.finish('close'));

    this.root = scene.add
      .container(0, 0, [backdrop, this.frame, ...this.corners, this.title, this.body, this.action.container, this.close.container])
      .setDepth(300)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  // Affiche un ecran ; onDone recoit le bouton choisi. broken : console en panne (texte qui vacille).
  show(screen: ConsoleScreen, broken: boolean, onDone: (result: ConsoleResult) => void): void {
    this.clear();
    this.done = onDone;
    this.root.setVisible(true);
    this.title.setText(screen.titre);

    const r = this.screenRect;
    const width = r.width - PAD * 2;
    let y = PAD;
    const texts = screen.lignes.map((line) => {
      const text = this.scene.add
        .text(r.x + PAD, y, line.texte, { ...textStyle(TEXT_SIZE, TONES[line.ton ?? 'normal']), wordWrap: { width, useAdvancedWrap: true }, lineSpacing: 1 })
        .setAlpha(0);
      y += text.height + LINE_GAP;
      return text;
    });
    // Mise en page : titre, ecran (hauteur du contenu, au moins un tiers de l'ecran), boutons ; centre verticalement.
    const H = LOGICAL_HEIGHT;
    r.height = Math.max(H * 0.34, y - LINE_GAP + PAD);
    const buttonsH = (screen.action ? 34 + 12 : 0) + 30;
    const top = Math.max(MARGIN, (H - (34 + r.height + 20 + buttonsH)) / 2);
    this.title.setY(top + 14);
    r.y = top + 34;
    this.drawFrame();
    for (const t of texts) t.y += r.y;
    let by = r.bottom + 20;
    if (screen.action) {
      this.action.container.setPosition(LOGICAL_WIDTH / 2, by + 17);
      by += 34 + 12;
    }
    this.close.container.setPosition(LOGICAL_WIDTH / 2, by + 15);

    screen.lignes.forEach((line, i) => {
      const text = texts[i];
      this.body.add(text);
      this.lines.push(text);
      // Apparition ligne par ligne, avec un bref scintillement.
      this.timers.push(this.scene.time.delayedCall(250 + i * LINE_DELAY, () => this.reveal(text)));
      if (line.ton === 'alerte') this.scene.tweens.add({ targets: text, alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: -1, delay: 400 + i * LINE_DELAY + 500 });
    });

    this.action.container.setVisible(Boolean(screen.action));
    this.action.setLabel(screen.action ?? '');
    this.action.setEnabled(false);
    this.close.setLabel(screen.fermer);
    // L'action devient possible une fois tout affiche (evite un choix par reflexe).
    this.timers.push(this.scene.time.delayedCall(250 + screen.lignes.length * LINE_DELAY + 200, () => this.action.setEnabled(true)));

    if (broken) this.flicker = this.scene.tweens.add({ targets: this.body, alpha: { from: 1, to: 0.45 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 900, hold: 60 });
  }

  private drawFrame(): void {
    const r = this.screenRect;
    const f = this.frame.clear();
    f.fillStyle(SCREEN_FILL, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 6);
    f.lineStyle(1, BORDER, 0.55).strokeRoundedRect(r.x, r.y, r.width, r.height, 6);
    f.lineStyle(1, BORDER, 0.06);
    for (let y = r.y + 3; y < r.bottom - 2; y += 3) f.lineBetween(r.x + 2, y, r.right - 2, y);
    const [tl, tr, bl, br] = this.corners;
    tl.setPosition(r.x - 3, r.y - 3);
    tr.setPosition(r.right + 3, r.y - 3);
    bl.setPosition(r.x - 3, r.bottom + 3);
    br.setPosition(r.right + 3, r.bottom + 3);
  }

  private reveal(text: Phaser.GameObjects.Text): void {
    if (text.alpha > 0) return;
    this.scene.tweens.chain({ targets: text, tweens: [{ alpha: 0.6, duration: 40 }, { alpha: 0.2, duration: 40 }, { alpha: 1, duration: 80 }] });
  }

  private revealAll(): void {
    for (const t of this.lines) if (t.alpha === 0) t.setAlpha(1);
    this.action.setEnabled(true);
  }

  private finish(result: ConsoleResult): void {
    const done = this.done;
    this.hide();
    done?.(result);
  }

  hide(): void {
    this.clear();
    this.root.setVisible(false);
  }

  private clear(): void {
    this.done = null;
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.flicker?.stop();
    this.flicker = null;
    this.body.setAlpha(1);
    for (const t of this.lines) {
      this.scene.tweens.killTweensOf(t);
      t.destroy();
    }
    this.lines = [];
  }
}
