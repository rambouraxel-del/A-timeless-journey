import Phaser from 'phaser';

export function createTextButton(scene: Phaser.Scene, x: number, y: number, label: string, onTap: () => void, onRelease?: () => void, scale = 1) {
  const w = 76 * scale;
  const h = 34 * scale;
  const bg = scene.add.rectangle(0, 0, w, h, 0x2a2a33).setStrokeStyle(1, 0x8a8a96);
  const text = scene.add.text(0, 0, label, { fontFamily: 'monospace', fontSize: `${Math.round(12 * scale)}px`, color: '#e6e6ee' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]).setSize(w, h).setInteractive({ useHandCursor: true });
  button.on('pointerdown', () => {
    bg.setFillStyle(0x3d3d49);
    onTap();
  });
  const release = () => {
    bg.setFillStyle(0x2a2a33);
    onRelease?.();
  };
  button.on('pointerup', release);
  button.on('pointerout', release);
  return button;
}
