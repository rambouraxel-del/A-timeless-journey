// Le jeu est dessine a la resolution reelle de l'ecran (pas de flou d'agrandissement).
//  - RENDER_SCALE : nombre entier de pixels d'ecran par pixel "logique" du jeu (1 a 4).
//  - Toutes les positions du jeu restent exprimees en pixels logiques (~360 de large).
// Le format suit celui du telephone : 16:9 minimum, 860/360 maximum.
export const DESIGN_WIDTH = 360;
const MIN_RATIO = 640 / 360;
const MAX_RATIO = 860 / 360;

const win = typeof window === 'undefined' ? { innerWidth: 360, innerHeight: 640, devicePixelRatio: 1 } : window;
const dpr = win.devicePixelRatio || 1;
const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, win.innerHeight / win.innerWidth));
const cssWidth = Math.min(win.innerWidth, win.innerHeight / ratio);
const deviceWidth = Math.round(cssWidth * dpr);
const deviceHeight = Math.round(cssWidth * ratio * dpr);

export const RENDER_SCALE = Math.min(4, Math.max(1, Math.round(deviceWidth / 380)));
export const LOGICAL_WIDTH = Math.floor(deviceWidth / RENDER_SCALE);
export const LOGICAL_HEIGHT = Math.floor(deviceHeight / RENDER_SCALE);
export const CANVAS_WIDTH = LOGICAL_WIDTH * RENDER_SCALE;
export const CANVAS_HEIGHT = LOGICAL_HEIGHT * RENDER_SCALE;

// Jeu de textures d'interface charge (dossier public/assets/ui/x<densite>/).
export const UI_DENSITY = Math.min(4, Math.max(2, RENDER_SCALE));

// Environ 69 % de l'ecran pour la scene de jeu, 31 % pour le panneau de controle.
export const GAME_VIEW = { x: 0, y: 0, width: LOGICAL_WIDTH, height: Math.round(LOGICAL_HEIGHT * 0.69) };
export const UI_ZONE = { x: 0, y: GAME_VIEW.height, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT - GAME_VIEW.height };

// Une salle standard = 6 ecrans de 360 px de long.
export const SCREENS_PER_ROOM = 6;
export const ROOM_WIDTH = SCREENS_PER_ROOM * DESIGN_WIDTH;
