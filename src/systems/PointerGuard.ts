import type Phaser from 'phaser';

// Un appui sur l'interface (dialogue, objet recupere) ne doit rien declencher derriere elle : ni joystick, ni
// interaction avec la salle. L'element qui consomme l'appui le signale ici ; les autres le verifient.
let consumed = '';

const stamp = (p: Phaser.Input.Pointer): string => `${p.id}:${p.downTime}`;

export const PointerGuard = {
  consume(pointer: Phaser.Input.Pointer): void {
    consumed = stamp(pointer);
  },
  isConsumed(pointer: Phaser.Input.Pointer): boolean {
    return consumed === stamp(pointer);
  },
};
