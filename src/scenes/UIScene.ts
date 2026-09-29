import Phaser from 'phaser';
import { GAME_VIEW, LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE, UI_ZONE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { controls } from '@/systems/Controls';
import type { DialogueLine } from '@/systems/Dialogue';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { DialogueBox, dialogueHeight } from '@/ui/DialogueBox';
import { Hud } from '@/ui/Hud';
import { ImageButton } from '@/ui/ImageButton';
import { uiImage, useLogicalCamera } from '@/ui/UiImage';
import { textStyle, UiColors } from '@/ui/UiStyle';
import { VirtualJoystick } from '@/ui/VirtualJoystick';

// Interface : HUD en haut, panneau decoratif en bas avec joystick, INTERAGIR, COURIR, dialogues.
// Les commandes sont groupees en haut du panneau et grandissent (jusqu'a x1,3) quand le
// panneau est plus haut (telephones allonges), pour ne laisser aucune grande zone vide.
export class UIScene extends Phaser.Scene {
  private joystick!: VirtualJoystick;
  private dialogue!: DialogueBox;
  private hud!: Hud;
  private hint!: Phaser.GameObjects.Text;
  private runHeld = false;
  private keys!: Record<'left' | 'right' | 'up' | 'down' | 'run' | 'interact', Phaser.Input.Keyboard.Key[]>;

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    useLogicalCamera(this, RENDER_SCALE);
    const W = LOGICAL_WIDTH;
    const top = UI_ZONE.y;
    const s = Phaser.Math.Clamp(UI_ZONE.height / 200, 1, 1.3);
    const si = s * 0.95; // INTERAGIR legerement plus petit, pour equilibrer avec le joystick

    // Positions des commandes (centres), calculees depuis le haut du panneau.
    const joystick = { x: 14 + 64 * s, y: top + 24 + 64 * s };
    const interact = { x: W - 14 - 48 * si, y: top + 22 + 48 * si };
    const run = { x: W - 12 - 33 * s, y: interact.y + 48 * si + 33 * s - 10 };
    const controlsTop = joystick.y - 64 * s;

    this.createPanel(joystick, interact, s, si);

    const stickArea = new Phaser.Geom.Rectangle(0, top, W * 0.55, UI_ZONE.height);
    this.joystick = new VirtualJoystick(this, joystick.x, joystick.y, s, stickArea);
    new ImageButton(this, interact.x, interact.y, 'btn_interact', 'btn_interact_pressed', si, { onDown: () => this.interact() });
    new ImageButton(this, run.x, run.y, 'btn_run', 'btn_run_pressed', s, {
      onDown: () => (this.runHeld = true),
      onUp: () => (this.runHeld = false),
    });

    this.hud = new Hud(this, 4, 4, controls.maxHealth);
    new ImageButton(this, W - 23, 23, 'btn_menu', null, 1, { onDown: () => this.showHint('Menu : à venir.') });

    // La boite de dialogue se pose juste au-dessus des commandes.
    const dialogueWidth = Math.min(W - 16, 420);
    const dialogueY = controlsTop - 6 - dialogueHeight(dialogueWidth);
    controls.dialogueTop = dialogueY;
    this.dialogue = new DialogueBox(this, (W - dialogueWidth) / 2, dialogueY, dialogueWidth, () => (controls.locked = false));

    this.hint = this.add
      .text(W / 2, GAME_VIEW.height - 8, '', { ...textStyle(14, UiColors.gold), backgroundColor: '#10121cdd', padding: { x: 6, y: 2 } })
      .setOrigin(0.5, 1)
      .setDepth(200)
      .setAlpha(0);

    this.createKeyboard();

    const onDialogue = (lines: DialogueLine[]) => {
      controls.locked = true;
      this.runHeld = false;
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
    const keyboard = kx !== 0 || ky !== 0;
    controls.move.x = keyboard ? kx : this.joystick.value.x;
    controls.move.y = keyboard ? ky : this.joystick.value.y;
    controls.run = this.runHeld || down(this.keys.run) === 1;
    this.hud.update(controls.health, controls.stamina);
  }

  private createPanel(joystick: { x: number; y: number }, interact: { x: number; y: number }, s: number, si: number): void {
    const W = LOGICAL_WIDTH;
    const top = UI_ZONE.y;
    this.add.rectangle(0, top, W, UI_ZONE.height, UiColors.panel).setOrigin(0);

    // Montagnes en bas, motif astral entre le joystick et le bouton INTERAGIR.
    uiImage(this, 'orn_mountains', W / 2, LOGICAL_HEIGHT, W / 440).setOrigin(0.5, 1);
    const gapLeft = joystick.x + 64 * s;
    const gapRight = interact.x - 48 * si;
    uiImage(this, 'orn_astral', (gapLeft + gapRight) / 2, joystick.y + 2, s).setAlpha(0.5);

    uiImage(this, 'orn_separator', W / 2, top + 1);
    uiImage(this, 'orn_corner', 3, top + 3).setOrigin(0);
    uiImage(this, 'orn_corner', W - 3, top + 3).setOrigin(1, 0).setFlipX(true);
  }

  private createKeyboard(): void {
    // Fleches ou ZQSD pour bouger, Maj pour courir, Espace/E pour interagir (tests sur ordinateur).
    const kb = this.input.keyboard!;
    const k = (...codes: string[]) => codes.map((c) => kb.addKey(c));
    this.keys = {
      left: k('LEFT', 'Q'),
      right: k('RIGHT', 'D'),
      up: k('UP', 'Z'),
      down: k('DOWN', 'S'),
      run: k('SHIFT'),
      interact: k('SPACE', 'E'),
    };
    for (const key of this.keys.interact) key.on('down', () => this.interact());
  }

  private interact(): void {
    if (this.dialogue.isOpen) this.dialogue.advance();
    else EventBus.emit(GameEvents.InteractRequest);
  }

  private showHint(text: string): void {
    this.tweens.killTweensOf(this.hint);
    this.hint.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 1400, duration: 400 });
  }
}
