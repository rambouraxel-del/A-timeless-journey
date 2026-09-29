// Chemins relatifs a public/. Tout asset du jeu est declare ici, et nulle part ailleurs.
export const Assets = {
  hero: {
    key: 'hero',
    url: 'assets/characters/hero/hero.png',
    frameWidth: 152,
    frameHeight: 152,
    // Position des pieds dans une case de 152 px (le sprite est ancre sur ses pieds).
    feetY: 129,
  },
} as const;

// Lignes de la planche du heros (voir tools/assembler-heros.py) : 8 colonnes.
const COLS = 8;
export const HeroFrames = {
  walkLeft: { start: 0 * COLS, end: 0 * COLS + 7 },
  walkRight: { start: 1 * COLS, end: 1 * COLS + 7 },
  idleLeft: { start: 2 * COLS, end: 2 * COLS },
  idleRight: { start: 3 * COLS, end: 3 * COLS },
} as const;

// Elements d'interface (tailles dans UiSizes.generated.ts), decoupes par tools/decouper-ui.py
// dans public/assets/ui/x<densite>/<cle>.png.
export { UiSizes } from './UiSizes.generated';
export const UiTextureKeys = [
  'hud_emblem',
  'hud_hearts_frame',
  'hud_heart_full',
  'hud_heart_empty',
  'hud_energy_frame',
  'hud_energy_fill',
  'btn_menu',
  'joystick_base',
  'joystick_thumb',
  'btn_interact',
  'btn_interact_pressed',
  'btn_run',
  'btn_run_pressed',
  'dialogue_box',
  'dialogue_nameplate',
  'marker_interact',
  'orn_astral',
  'orn_mountains',
  'orn_separator',
  'orn_corner',
] as const;

export const UiFont = { family: 'VT323', url: 'assets/fonts/VT323-Regular.ttf' } as const;
