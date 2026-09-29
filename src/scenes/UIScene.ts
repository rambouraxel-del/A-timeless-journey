import Phaser from 'phaser';
import { GAME_VIEW, SCREEN_HEIGHT, SCREEN_WIDTH } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import { controls } from '@/systems/Controls';
import type { DialogueLine } from '@/systems/Dialogue';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { DialogueBox } from '@/ui/DialogueBox';
import { Hud } from '@/ui/Hud';
import { ImageButton } from '@/ui/ImageButton';
import { textStyle, UiColors } from '@/ui/UiStyle';
import { VirtualJoystick } from '@/ui/VirtualJoystick';

// Les controles sont ancres au bas de l'ecran ; sur un ecran 16:9 (640 px), la boite de
// dialogue deborde un peu sur le bas de la scene, comme sur la maquette.
const H = SCREEN_HEIGHT;
const LAYOUT = {
  joystick: { x: 84, y: H - 118, travel: 34 },
  interact: { x: 286, y: H - 134 },
  run: { x: 318, y: H - 62 },
  astral: { x: 178, y: H - 124 },
  controlsTop: H - 186,
};

// Interface : HUD en haut, panneau decoratif en bas avec joystick, INTERAGIR, COURIR, dialogues.
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
    this.createPanel();

    const stickArea = new Phaser.Geom.Rectangle(0, LAYOUT.controlsTop, 200, H - LAYOUT.controlsTop);
    this.joystick = new VirtualJoystick(this, LAYOUT.joystick.x, LAYOUT.joystick.y, LAYOUT.joystick.travel, stickArea);
    new ImageButton(this, LAYOUT.interact.x, LAYOUT.interact.y, 'btn_interact', 'btn_interact_pressed', { onDown: () => this.interact() });
    new ImageButton(this, LAYOUT.run.x, LAYOUT.run.y, 'btn_run', 'btn_run_pressed', {
      onDown: () => (this.runHeld = true),
      onUp: () => (this.runHeld = false),
    });

    this.hud = new Hud(this, 4, 4, controls.maxHealth);
    new ImageButton(this, SCREEN_WIDTH - 23, 23, 'btn_menu', null, { onDown: () => this.showHint('Menu : à venir.') });

    this.dialogue = new DialogueBox(this, 10, LAYOUT.controlsTop - 86, () => (controls.locked = false));

    this.hint = this.add
      .text(SCREEN_WIDTH / 2, GAME_VIEW.height - 8, '', { ...textStyle(14, UiColors.gold), backgroundColor: '#10121cdd', padding: { x: 6, y: 2 } })
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

  private createPanel(): void {
    const top = GAME_VIEW.height;
    this.add.rectangle(0, top, SCREEN_WIDTH, H - top, UiColors.panel).setOrigin(0);
    this.add.image(SCREEN_WIDTH / 2, top, 'orn_separator');
    this.add.image(3, top + 3, 'orn_corner').setOrigin(0);
    this.add.image(SCREEN_WIDTH - 3, top + 3, 'orn_corner').setOrigin(1, 0).setFlipX(true);
    this.add.image(SCREEN_WIDTH / 2, H, 'orn_mountains').setOrigin(0.5, 1);
    this.add.image(LAYOUT.astral.x, LAYOUT.astral.y, 'orn_astral').setAlpha(0.9);
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
