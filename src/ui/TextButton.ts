import Phaser from 'phaser';
import { PLATE_SLICES, resizeNineSlice, uiNineSlice } from './NineSlice';
import { textStyle, UiColors } from './UiStyle';

// Bouton texte aux couleurs de l'interface (cartouche dore), largeur imposee.
export class TextButton {
  readonly container: Phaser.GameObjects.Container;
  private readonly plate: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    label: string,
    readonly width: number,
    readonly height: number,
    onTap: (button: TextButton) => void,
  ) {
    this.plate = uiNineSlice(scene, 'dialogue_nameplate', PLATE_SLICES);
    resizeNineSlice(this.plate, width, height);
    this.plate.setPosition(-width / 2, -height / 2);
    this.text = scene.add.text(0, 0, label, { ...textStyle(16, UiColors.gold), align: 'center', lineSpacing: 0 }).setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.plate, this.text]);
    this.plate.setInteractive();
    this.plate.on('pointerdown', () => this.enabled && this.container.setScale(0.96));
    this.plate.on('pointerout', () => this.container.setScale(1));
    this.plate.on('pointerup', () => {
      this.container.setScale(1);
      if (this.enabled) onTap(this);
    });
  }

  setLabel(label: string): void {
    this.text.setText(label);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.container.setAlpha(enabled ? 1 : 0.4);
  }
}
