// Chemins relatifs a public/. Tout asset du jeu est declare ici, et nulle part ailleurs.
export const Assets = {
  hero: {
    key: 'hero',
    url: 'assets/characters/hero_temp/hero_lpc.png',
    frameWidth: 64,
    frameHeight: 64,
    // Position des pieds dans une image de 64 px (le sprite est ancre sur ses pieds).
    feetY: 62,
  },
} as const;

// Lignes de la planche du heros (voir tools/assembler-heros-lpc.py).
const COLS = 9;
export const HeroFrames = {
  walkLeft: { start: 0 * COLS + 1, end: 0 * COLS + 8 },
  walkRight: { start: 1 * COLS + 1, end: 1 * COLS + 8 },
  idleLeft: { start: 2 * COLS, end: 2 * COLS + 1 },
  idleRight: { start: 3 * COLS, end: 3 * COLS + 1 },
  climb: { start: 4 * COLS, end: 4 * COLS + 5 },
} as const;
