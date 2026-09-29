import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { UI_ZONE } from '@/config/Layout';
import { controls } from '@/systems/Controls';
import type { DialogueLine } from '@/systems/Dialogue';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { DialogueBox } from '@/ui/DialogueBox';
import { createTextButton } from '@/ui/TextButton';
import { VirtualJoystick } from '@/ui/VirtualJoystick';

// Tiers bas de l'ecran : joystick, boutons, dialogues. Tourne en parallele de la salle active.
export class UIScene extends Phaser.Scene {
  private joystick!: VirtualJoystick;
  private buttons: Phaser.GameObjects.Container[] = [];
  private dialogue!: DialogueBox;
  private hint!: Phaser.GameObjects.Text;
  private keys!: Record<'left' | 'right' | 'up' | 'down', Phaser.Input.Keyboard.Key[]>;

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    const zone = new Phaser.Geom.Rectangle(UI_ZONE.x, UI_ZONE.y, UI_ZONE.width, UI_ZONE.height);
    this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0x15151a).setOrigin(0);
    this.add.rectangle(zone.x, zone.y, zone.width, 2, 0x3a3a44).setOrigin(0);

    const stickArea = new Phaser.Geom.Rectangle(zone.x, zone.y, zone.width * 0.6, zone.height);
    this.joystick = new VirtualJoystick(this, zone.x + 95, zone.centerY + 6, 52, stickArea);

    const bx = zone.right - 58;
    this.buttons = [
      createTextButton(this, bx, zone.y + 48, 'MENU', () => this.showHint('Menu : à venir.')),
      createTextButton(this, bx, zone.y + 96, 'SAC', () => this.showHint('Inventaire : à venir.')),
    ];

    this.hint = this.add
      .text(zone.centerX, zone.y - 10, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffe066', backgroundColor: '#000000aa', padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.dialogue = new DialogueBox(this, zone, () => this.setDialogueMode(false));

    const kb = this.input.keyboard!;
    // Fleches ou ZQSD, pour tester sur ordinateur.
    this.keys = {
      left: [kb.addKey('LEFT'), kb.addKey('Q')],
      right: [kb.addKey('RIGHT'), kb.addKey('D')],
      up: [kb.addKey('UP'), kb.addKey('Z')],
      down: [kb.addKey('DOWN'), kb.addKey('S')],
    };

    const onDialogue = (lines: DialogueLine[]) => {
      this.setDialogueMode(true);
      this.dialogue.open(lines);
    };
    EventBus.on(GameEvents.DialogueOpen, onDialogue);
    EventBus.on(GameEvents.Hint, this.showHint, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.DialogueOpen, onDialogue);
      EventBus.off(GameEvents.Hint, this.showHint, this);
    });
  }

  update(): void {
    const down = (keys: Phaser.Input.Keyboard.Key[]) => (keys.some((k) => k.isDown) ? 1 : 0);
    const kx = down(this.keys.right) - down(this.keys.left);
    const ky = down(this.keys.down) - down(this.keys.up);
    controls.move.x = kx !== 0 || ky !== 0 ? kx : this.joystick.value.x;
    controls.move.y = kx !== 0 || ky !== 0 ? ky : this.joystick.value.y;
  }

  private setDialogueMode(open: boolean): void {
    controls.locked = open;
    this.joystick.setVisible(!open);
    for (const b of this.buttons) b.setVisible(!open);
    if (!open) EventBus.emit(GameEvents.DialogueClosed);
  }

  private showHint(text: string): void {
    this.tweens.killTweensOf(this.hint);
    this.hint.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 1400, duration: 400 });
  }
}
