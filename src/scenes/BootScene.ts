import Phaser from 'phaser';
import { RENDER_SCALE } from '@/config/Layout';
import { MenuImages } from '@/config/Assets';
import { SceneKeys } from '@/config/SceneKeys';
import { useLogicalCamera } from '@/ui/UiImage';

// Charge le strict necessaire (fond, titre, boutons) pour afficher tout de suite l'ecran titre.
// Le reste des ressources est charge ensuite, avec une barre de progression.
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    useLogicalCamera(this, RENDER_SCALE);
    for (const image of MenuImages) this.load.image(image.key, image.url);
  }

  create(): void {
    // Images peintes (pas du pixel-art) : lissage bilineaire.
    for (const image of MenuImages) this.textures.get(image.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.scene.start(SceneKeys.Title);
  }
}
