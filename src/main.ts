import Phaser from 'phaser';
import { gameConfig } from '@/config/GameConfig';

const game = new Phaser.Game(gameConfig);

// Accessible depuis la console du navigateur en developpement uniquement.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;

// La resolution de rendu est calculee au demarrage : si la fenetre change vraiment de
// taille (rotation, ecran redimensionne), on recharge pour recalculer proprement.
const startWidth = window.innerWidth;
const startHeight = window.innerHeight;
let timer: number | undefined;
window.addEventListener('resize', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const dw = Math.abs(window.innerWidth - startWidth) / startWidth;
    const dh = Math.abs(window.innerHeight - startHeight) / startHeight;
    if (dw > 0.05 || dh > 0.08) window.location.reload();
  }, 400);
});
