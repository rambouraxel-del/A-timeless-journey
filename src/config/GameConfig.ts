import Phaser from 'phaser';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './Layout';
import { PreloadScene } from '@/scenes/PreloadScene';
import { GreyRoomScene } from '@/scenes/rooms/GreyRoomScene';
import { UIScene } from '@/scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'jeu',
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  backgroundColor: '#101014',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 }, // joystick + tap simultanes
  // L'ordre compte : la scene UI est dessinee par-dessus la salle.
  scene: [PreloadScene, GreyRoomScene, UIScene],
};
