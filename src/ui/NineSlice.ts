import Phaser from 'phaser';
import { UiSizes, type UiKey } from '@/config/UiSizes.generated';

// Epaisseur des bords (pixels logiques) des images d'interface decoupees en neuf parties.
export const FRAME_SLICES = { left: 17, right: 18, top: 23, bottom: 15 };
export const PLATE_SLICES = { left: 9, right: 9, top: 7, bottom: 7 };

// Image d'interface decoupee en neuf parties : les coins restent nets, les bords s'etirent.
export function uiNineSlice(scene: Phaser.Scene, key: UiKey, slices: typeof FRAME_SLICES): Phaser.GameObjects.NineSlice {
  const texture = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const r = texture.width / UiSizes[key].w; // pixels de texture par pixel logique
  const plate = scene.add.nineslice(0, 0, key, undefined, texture.width, texture.height, slices.left * r, slices.right * r, slices.top * r, slices.bottom * r);
  plate.setOrigin(0).setScale(1 / r);
  return plate;
}

// Redimensionne en pixels logiques.
export function resizeNineSlice(plate: Phaser.GameObjects.NineSlice, width: number, height: number): void {
  plate.setSize(width / plate.scaleX, height / plate.scaleY);
}
