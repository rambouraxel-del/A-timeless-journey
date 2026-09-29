import Phaser from 'phaser';
import type { DialogueLine } from '@/systems/Dialogue';

// Boite de dialogue qui recouvre le tiers bas de l'ecran. Un tap passe a la replique suivante.
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private openedAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    area: Phaser.Geom.Rectangle,
    private readonly onClose: () => void,
  ) {
    const pad = 14;
    const bg = scene.add.rectangle(area.x + 6, area.y + 6, area.width - 12, area.height - 12, 0x0c0c10, 0.96).setOrigin(0).setStrokeStyle(2, 0xc8c8d2);
    this.speaker = scene.add.text(area.x + pad, area.y + pad, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffe066' });
    this.body = scene.add.text(area.x + pad, area.y + pad + 20, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#f0f0f5',
      wordWrap: { width: area.width - pad * 2 },
      lineSpacing: 4,
    });
    const next = scene.add.text(area.right - pad, area.bottom - pad, '>', { fontFamily: 'monospace', fontSize: '12px', color: '#c8c8d2' }).setOrigin(1);
    scene.tweens.add({ targets: next, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    this.root = scene.add.container(0, 0, [bg, this.speaker, this.body, next]).setVisible(false).setDepth(100);

    scene.input.on('pointerdown', () => {
      // Ignore le tap qui vient d'ouvrir la boite.
      if (this.root.visible && scene.time.now - this.openedAt > 150) this.advance();
    });
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

  private advance(): void {
    this.index++;
    if (this.index < this.lines.length) this.show();
    else {
      this.root.setVisible(false);
      this.onClose();
    }
  }

  private show(): void {
    const line = this.lines[this.index];
    this.speaker.setText(line.speaker ?? '');
    this.body.setText(line.text);
  }
}
