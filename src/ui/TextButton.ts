import Phaser from 'phaser';

export function createTextButton(scene: Phaser.Scene, x: number, y: number, label: string, onTap: () => void, onRelease?: () => void) {
  const bg = scene.add.rectangle(0, 0, 76, 34, 0x2a2a33).setStrokeStyle(1, 0x8a8a96);
  const text = scene.add.text(0, 0, label, { fontFamily: 'monospace', fontSize: '12px', color: '#e6e6ee' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]).setSize(76, 34).setInteractive({ useHandCursor: true });
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
