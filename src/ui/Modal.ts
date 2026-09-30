import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/config/Layout';
import { FRAME_SLICES, resizeNineSlice, uiNineSlice } from './NineSlice';
import { TextButton } from './TextButton';
import { textStyle, UiColors } from './UiStyle';

export interface ModalButton {
  label: string;
  onTap: (button: TextButton, modal: Modal) => void;
  enabled?: boolean;
}

export interface ModalOptions {
  title?: string;
  text?: string;
  buttons: ModalButton[];
  // 'row' : boutons cote a cote (confirmation) ; 'column' : empiles (reglages).
  layout?: 'row' | 'column';
}

// Fenetre modale au style de l'interface : fond assombri qui bloque les touches, cadre dore,
// titre, texte et boutons. La hauteur s'adapte au contenu.
export class Modal {
  readonly buttons: TextButton[] = [];
  private readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: ModalOptions) {
    const W = LOGICAL_WIDTH;
    const H = LOGICAL_HEIGHT;
    const panelWidth = Math.min(W - 32, 320);
    const pad = 26;
    const inner = panelWidth - pad * 2;

    const overlay = scene.add.rectangle(0, 0, W, H, 0x05060c, 0.74).setOrigin(0).setInteractive();
    const frame = uiNineSlice(scene, 'dialogue_frame', FRAME_SLICES);
    const items: Phaser.GameObjects.GameObject[] = [overlay, frame];

    let y = pad;
    if (options.title) {
      const title = scene.add.text(panelWidth / 2, y, options.title, textStyle(22, UiColors.gold)).setOrigin(0.5, 0);
      items.push(title);
      y += title.height + 10;
    }
    if (options.text) {
      const text = scene.add
        .text(panelWidth / 2, y, options.text, { ...textStyle(17), align: 'center', wordWrap: { width: inner }, lineSpacing: 2 })
        .setOrigin(0.5, 0);
      items.push(text);
      y += text.height + 16;
    }

    const layout = options.layout ?? 'column';
    const buttonHeight = 32;
    const count = options.buttons.length;
    const buttonWidth = layout === 'row' ? (inner - 10 * (count - 1)) / count : inner;
    options.buttons.forEach((def, i) => {
      const button = new TextButton(scene, def.label, buttonWidth, buttonHeight, (b) => def.onTap(b, this));
      button.setEnabled(def.enabled !== false);
      if (layout === 'row') button.container.setPosition(pad + buttonWidth / 2 + i * (buttonWidth + 10), y + buttonHeight / 2);
      else button.container.setPosition(panelWidth / 2, y + buttonHeight / 2 + i * (buttonHeight + 8));
      this.buttons.push(button);
      items.push(button.container);
    });
    y += layout === 'row' ? buttonHeight : count * buttonHeight + (count - 1) * 8;

    const panelHeight = y + pad;
    resizeNineSlice(frame, panelWidth, panelHeight);
    const panel = scene.add.container((W - panelWidth) / 2, (H - panelHeight) / 2, items.slice(1));
    // Le fond couvre l'ecran ; on le garde hors du panneau pour qu'il ne suive pas son decalage.
    this.root = scene.add.container(0, 0, [overlay, panel]).setDepth(1000);
  }

  close(): void {
    this.root.destroy();
  }
}
