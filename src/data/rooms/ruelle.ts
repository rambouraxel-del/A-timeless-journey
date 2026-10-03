import { GAME_VIEW, HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { doorGeometry, doorTextureKey } from './portes';
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

// --- Scene 2 : homme blesse et porte impossible ------------------------------------------
// Coordonnees en pixels du panorama (2172 x 724).

// Ordre d'affichage selon les pieds : plus bas a l'ecran = plus devant. La porte impossible sert de repere
// (profondeur 50) : un personnage dont les pieds sont plus hauts que sa base passe derriere elle.
export const depthAtFeet = (feetY: number): number => 50 + (feetY / S - IMPOSSIBLE_DOOR.base) * 0.1;

// Porte impossible : la porte du vaisseau (cadre compris), plantee seule au milieu de la rue, decollee des facades.
// Centre x, base (seuil) et hauteur visible ; la porte ouverte montre l'interieur du vaisseau.
export const IMPOSSIBLE_DOOR = { id: 'porte_temps', x: 1640, base: 605, height: 205 };
export const impossibleDoorGeo = doorGeometry(IMPOSSIBLE_DOOR.x * S, IMPOSSIBLE_DOOR.base * S, IMPOSSIBLE_DOOR.height * S, false);
export const OPEN_TO_SHIP = { key: 'porte:ouverte_vaisseau', url: 'assets/rooms/portes/porte_ouverte_vaisseau.png' };

// Tour de la porte : le sol principal (Y = FEET_Y) se separe en une allee devant (plus bas a l'ecran) et une allee
// derriere (contre les facades), qui se rejoignent de l'autre cote. Haut / bas sur le joystick pour choisir.
export const AROUND = { split: 240, front: { y: 640, half: 80 }, back: { y: 560, half: 170 } };

// Homme mysterieux blesse, assis contre le sol. Meme taille de pixel que le sprite debout du musee : les deux images
// font 313 px (tools/preparer-gardien.py), personnage debout visible sur 292 px, assis : pieds a Y = 293.
export const WOUNDED = { id: 'homme_blesse', x: 1250, feet: 584, key: 'ruelle:homme-blesse', url: 'assets/characters/gardien/blesse.png' };
const GARDIEN = { image: 313, standingVisible: 292, woundedFeet: 293, woundedVisibleWidth: 271, size: 1.06 };
export const woundedScale = (HERO_VISIBLE_LOGICAL * GARDIEN.size) / GARDIEN.standingVisible;
export const woundedOriginY = GARDIEN.woundedFeet / GARDIEN.image;

// Textures propres a la ruelle (chargees a l'entree de la scene, liberees a sa sortie).
export const SCENE_TEXTURES = [OPEN_TO_SHIP, { key: WOUNDED.key, url: WOUNDED.url }];

export const woundedDef: InteractableDef = {
  id: WOUNDED.id,
  kind: 'character',
  label: 'Homme mystérieux',
  // Hors de la salle tant que le coup de feu n'a pas eu lieu (RuelleScene le replace).
  x: -100000,
  y: WOUNDED.feet * S + (GARDIEN.image - GARDIEN.woundedFeet) * woundedScale,
  width: GARDIEN.image * woundedScale,
  height: GARDIEN.image * woundedScale,
  textureKey: WOUNDED.key,
  standY: groundY,
  reachX: (GARDIEN.woundedVisibleWidth / 2) * woundedScale + 24,
  depth: depthAtFeet(WOUNDED.feet * S) - 0.05,
};

export const impossibleDoorDef: InteractableDef = {
  id: IMPOSSIBLE_DOOR.id,
  kind: 'door',
  label: 'Porte',
  x: impossibleDoorGeo.x,
  y: impossibleDoorGeo.y,
  width: impossibleDoorGeo.width,
  height: impossibleDoorGeo.height,
  textureKey: doorTextureKey('closed', false),
  // Utilisable seulement depuis l'allee de devant.
  standY: AROUND.front.y * S,
  reachX: impossibleDoorGeo.visibleWidth / 2 + 20 * S,
  depth: 49.95,
};

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
  woundedDef,
  impossibleDoorDef,
];

// Chemins : sol principal, puis boucle autour de la porte impossible (devant / derriere), puis sol jusqu'au mur.
const D = IMPOSSIBLE_DOOR.x;
const P = (x: number, y: number) => ({ x: x * S, y: y * S });
const floor = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ kind: 'floor' as const, from: a, to: b });
const split = P(D - AROUND.split, FEET_Y);
const join = P(D + AROUND.split, FEET_Y);
const paths = [
  floor(P(WALK.left, FEET_Y), split),
  floor(split, P(D - AROUND.front.half, AROUND.front.y)),
  floor(P(D - AROUND.front.half, AROUND.front.y), P(D + AROUND.front.half, AROUND.front.y)),
  floor(P(D + AROUND.front.half, AROUND.front.y), join),
  floor(split, P(D - AROUND.back.half, AROUND.back.y)),
  floor(P(D - AROUND.back.half, AROUND.back.y), P(D + AROUND.back.half, AROUND.back.y)),
  floor(P(D + AROUND.back.half, AROUND.back.y), join),
  floor(join, P(WALK.right, FEET_Y)),
];

export const ruelle: RoomDefinition = {
  id: 'ruelle',
  name: 'Ruelle',
  width: roomWidth,
  height: GAME_VIEW.height,
  // Apparition par defaut (nouvelle partie directe) : devant la sortie de secours.
  spawn: { x: 330 * S, y: groundY },
  paths,
  interactables,
  heroScale,
};
