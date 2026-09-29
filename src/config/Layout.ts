// Resolution logique portrait : tout le jeu est pense en 360 x 640, puis mis a l'echelle de l'ecran.
export const SCREEN_WIDTH = 360;
export const SCREEN_HEIGHT = 640;

// 2/3 haut : la scene de jeu. 1/3 bas : joystick, boutons, boite de dialogue.
export const GAME_VIEW = { x: 0, y: 0, width: SCREEN_WIDTH, height: Math.round((SCREEN_HEIGHT * 2) / 3) };
export const UI_ZONE = { x: 0, y: GAME_VIEW.height, width: SCREEN_WIDTH, height: SCREEN_HEIGHT - GAME_VIEW.height };

// Une salle standard = 6 ecrans de long.
export const SCREENS_PER_ROOM = 6;
