import type Phaser from 'phaser';

// Partie visible d'une image (pixels opaques) : hauteur visible et ligne des pieds, pour ancrer et
// mettre a l'echelle un personnage quelle que soit la taille de son image.
export function spriteBox(scene: Phaser.Scene, key: string): { height: number; feetY: number; visibleHeight: number } {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  let top = img.height;
  let bottom = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 40) {
        if (y < top) top = y;
        bottom = y;
        break;
      }
    }
  }
  if (bottom < 0) return { height: img.height, feetY: img.height, visibleHeight: img.height };
  return { height: img.height, feetY: bottom + 1, visibleHeight: bottom + 1 - top };
}
