import { GAME_VIEW, HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import manifest from './ruelle/manifest.json';

// Ruelle du Louvre : une cour finie, representee par un seul panorama transparent (facade + sol, 2172 x 724 px,
// jamais repete) devant deux plans de fond (batiments lointains et ciel, des images de l'ancien pack gardees telles
// quelles). Echelle unique S = hauteur de la vue / 724 : le panorama garde ses proportions, sans etirement ni
// recadrage. Position ecran = x asset x scale de la couche x S - camera x facteur.
export const WORLD_WIDTH = manifest.world.width; // 2172
export const WORLD_HEIGHT = manifest.world.height; // 724
export const S = GAME_VIEW.height / WORLD_HEIGHT;
export const roomWidth = WORLD_WIDTH * S;
// Pieds du heros : sur les paves, en avant de la base des murs (Y = 548 dans le panorama) ; plus FEET_Y est grand,
// plus il marche bas dans l'image.
export const FEET_Y = manifest.world.feetY; // 590
export const groundY = FEET_Y * S;

// Heros a la meme taille que dans le musee (116 px de galerie sur 704 de haut).
const HERO_VISIBLE_SHEET_PX = 105;
const HERO_VISIBLE_LOGICAL = 116 * (GAME_VIEW.height / 704);
export const heroScale = (HERO_VISIBLE_LOGICAL * RENDER_SCALE) / (HERO_VISIBLE_SHEET_PX * HERO_PIXEL_SCALE);

// --- Couches ----------------------------------------------------------------------

// Ordre : fond bleu #52ADF2, ciel (0,15), batiments lointains (0,65), panorama facade + sol (1), puis heros (50).
// Le panorama est un seul plan : facade et sol ne peuvent pas glisser l'un par rapport a l'autre.
export const SKY_COLOR = 0x52adf2;
export const LAYER_DEPTH: Record<string, number> = { ciel: 0, batiments: 5, panorama: 20 };
export interface RuelleImage {
  key: string;
  url: string;
  layer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number; // taille d'affichage d'un pixel de l'image, relativement a S
  parallax: number;
}
export const IMAGES: RuelleImage[] = manifest.layers.map((l) => ({
  key: `ruelle:${l.file}`,
  url: `assets/rooms/ruelle/${l.file}`,
  layer: l.layer,
  x: l.x,
  y: l.y,
  width: l.width,
  height: l.height,
  scale: l.scale,
  parallax: l.parallax,
}));

// --- Sortie de secours : dessinee dans le panorama, porte statique --------------------

// Zone d'interaction calee sur la porte (cadre X 180 a 235, base Y 548, hauteur ~175).
export const EXIT = { id: 'sortie_secours', x: 207, base: 548, width: 62, height: 176 };
// Limites de marche : a gauche, devant le batiment d'angle ; a droite, avant l'angle du mur de retour (X ~ 2027).
export const WALK = { left: 85, right: 1975 };

const interactables: InteractableDef[] = [
  {
    id: EXIT.id,
    kind: 'door',
    label: 'Sortie de secours',
    x: EXIT.x * S,
    y: EXIT.base * S,
    width: EXIT.width * S,
    height: EXIT.height * S,
    standY: groundY,
    reachX: (EXIT.width / 2 + 60) * S,
  },
];

export const ruelle: RoomDefinition = {
  id: 'ruelle',
  name: 'Ruelle',
  width: roomWidth,
  height: GAME_VIEW.height,
  // Apparition par defaut (nouvelle partie directe) : devant la sortie de secours.
  spawn: { x: 330 * S, y: groundY },
  paths: [{ kind: 'floor', from: { x: WALK.left * S, y: groundY }, to: { x: WALK.right * S, y: groundY } }],
  interactables,
  heroScale,
};
