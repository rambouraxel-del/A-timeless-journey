import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './Layout';
import { BootScene } from '@/scenes/BootScene';
import { TitleScene } from '@/scenes/TitleScene';
import { MuseeScene } from '@/scenes/rooms/MuseeScene';
import { ForetScene } from '@/scenes/rooms/ForetScene';
import { RuelleScene } from '@/scenes/rooms/RuelleScene';
import { VaisseauScene } from '@/scenes/rooms/VaisseauScene';
import { UIScene } from '@/scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'jeu',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#101014',
  pixelArt: true, // agrandissement sans lissage pour le decor et le heros
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 }, // joystick + tap simultanes
  // L'ordre compte : la scene UI est dessinee par-dessus la salle.
  scene: [BootScene, TitleScene, VaisseauScene, MuseeScene, RuelleScene, ForetScene, UIScene],
};
