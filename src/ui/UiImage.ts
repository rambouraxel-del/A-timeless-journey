import Phaser from 'phaser';
import { UiSizes, type UiKey } from '@/config/UiSizes.generated';

// Image d'interface haute definition, affichee a sa taille logique (x scale).
export function uiImage(scene: Phaser.Scene, key: UiKey, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, key);
  return image.setScale((UiSizes[key].w * scale) / image.width);
}

// Camera en pixels logiques : le canvas est RENDER_SCALE fois plus grand, on zoome d'autant.
export function useLogicalCamera(scene: Phaser.Scene, renderScale: number): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(renderScale);
}
