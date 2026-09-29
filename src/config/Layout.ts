// Largeur logique fixe : 360. La hauteur suit le format de l'ecran (telephones allonges inclus)
// pour ne laisser aucune marge : 640 minimum (16:9), 860 maximum.
export const SCREEN_WIDTH = 360;
const BASE_HEIGHT = 640;
const MAX_HEIGHT = 860;
const screenRatio = typeof window === 'undefined' ? BASE_HEIGHT / SCREEN_WIDTH : window.innerHeight / window.innerWidth;
export const SCREEN_HEIGHT = Math.min(MAX_HEIGHT, Math.max(BASE_HEIGHT, Math.round(SCREEN_WIDTH * screenRatio)));

// La scene de jeu garde toujours la meme taille (2/3 d'un ecran 16:9).
// Tout le reste de l'ecran est pour le joystick, les boutons et les dialogues.
export const GAME_VIEW = { x: 0, y: 0, width: SCREEN_WIDTH, height: Math.round((BASE_HEIGHT * 2) / 3) };
export const UI_ZONE = { x: 0, y: GAME_VIEW.height, width: SCREEN_WIDTH, height: SCREEN_HEIGHT - GAME_VIEW.height };

// Une salle standard = 6 ecrans de long.
export const SCREENS_PER_ROOM = 6;
