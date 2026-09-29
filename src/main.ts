import Phaser from 'phaser';
import { gameConfig } from '@/config/GameConfig';

const game = new Phaser.Game(gameConfig);

// Accessible depuis la console du navigateur en developpement uniquement.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
