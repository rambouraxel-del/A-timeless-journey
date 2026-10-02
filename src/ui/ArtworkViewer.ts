import Phaser from 'phaser';
import { GAME_VIEW, LOGICAL_WIDTH } from '@/config/Layout';
import type { ArtworkView } from '@/systems/EventBus';
import { TextButton } from './TextButton';

const BACKDROP = 0x08080d;
const MARGIN = 12;
const TOP = 40; // sous le bouton Fermer

// Examen d'une oeuvre : l'image en grand sur un fond opaque qui masque entierement la salle
// (zone de jeu). Le texte s'affiche dans la boite de dialogue du panneau bas. L'image est
// chargee a la demande depuis les fichiers du jeu.
export class ArtworkViewer {
  private readonly root: Phaser.GameObjects.Container;
  private image: Phaser.GameObjects.Image | null = null;
  private current: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    onClose: () => void,
  ) {
    const backdrop = scene.add.rectangle(0, 0, LOGICAL_WIDTH, GAME_VIEW.height, BACKDROP, 1).setOrigin(0).setInteractive(); // bloque les touches dessous
    const close = new TextButton(scene, 'Fermer', 76, 26, () => onClose());
    close.container.setPosition(LOGICAL_WIDTH - MARGIN - 38, MARGIN + 13);
    const rule = scene.add.rectangle(MARGIN, TOP - 6, LOGICAL_WIDTH - MARGIN * 2, 1, 0xf2c46b, 0.35).setOrigin(0);
    this.root = scene.add.container(0, 0, [backdrop, rule, close.container]).setDepth(60).setVisible(false);
  }

  show(view: ArtworkView): void {
    this.current = view.key;
    this.root.setVisible(true);
    if (this.scene.textures.exists(view.key)) this.place(view.key);
    else {
      this.scene.load.image(view.key, view.url);
      this.scene.load.once(`filecomplete-image-${view.key}`, () => {
        if (this.current === view.key) this.place(view.key);
      });
      this.scene.load.start();
    }
  }

  hide(): void {
    this.current = null;
    this.root.setVisible(false);
    this.image?.destroy();
    this.image = null;
  }

  private place(key: string): void {
    this.image?.destroy();
    this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const src = this.scene.textures.get(key).getSourceImage();
    const availW = LOGICAL_WIDTH - MARGIN * 2;
    const availH = GAME_VIEW.height - TOP - MARGIN;
    const scale = Math.min(availW / src.width, availH / src.height);
    this.image = this.scene.add.image(LOGICAL_WIDTH / 2, TOP + availH / 2, key).setScale(scale);
    this.root.add(this.image);
  }
}
