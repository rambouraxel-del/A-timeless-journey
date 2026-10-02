import { GAME_VIEW, HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import manifest from './ruelle/scene-manifest.json';

// Ruelle du Louvre : 4 sections de 1086 x 1448 px (panorama 4344 x 1448), de gauche a droite, 4 couches
// chacune. Echelle unique S = hauteur de la vue / 1448 : aucune deformation. Les coordonnees du
// manifeste sont en pixels d'asset.
export const SECTION_WIDTH = manifest.sectionWidth; // 1086
export const WORLD_WIDTH = manifest.worldWidth; // 4344
export const WORLD_HEIGHT = manifest.worldHeight; // 1448
export const S = GAME_VIEW.height / WORLD_HEIGHT;
export const roomWidth = WORLD_WIDTH * S;
// Pieds du heros sur les paves : ligne de separation du sol.
export const groundY = manifest.recommendedFootY * S; // 1168

// Heros a la meme taille que dans le musee (116 px de galerie sur 704 de haut).
const HERO_VISIBLE_SHEET_PX = 105;
const HERO_VISIBLE_LOGICAL = 116 * (GAME_VIEW.height / 704);
export const heroScale = (HERO_VISIBLE_LOGICAL * RENDER_SCALE) / (HERO_VISIBLE_SHEET_PX * HERO_PIXEL_SCALE);

// --- Couches ----------------------------------------------------------------------

// Profondeurs du moteur : le heros est a 50, le premier plan (paves proches) passe devant lui.
// Facades, sol et premier plan : 4 sections, solidaires du monde (facteur 1). Ciel et maisons : images
// uniques, produites par tools/preparer-ruelle-fond.py a partir du fond du pack, qui defilent plus lentement.
export const SECTION_LAYERS = [
  { id: '01-facades', depth: 10 },
  { id: '02-sol', depth: 20 },
  { id: '03-premier-plan', depth: 60 },
] as const;
export const SECTIONS = manifest.sections; // { folder, x, y, width, height }
export const layerKey = (folder: string, layer: string) => `ruelle:${folder}:${layer}`;
export const layerUrl = (folder: string, layer: string) => `assets/rooms/ruelle/${folder}/${layer}.png`;

// Parallaxe reelle : facteur de defilement par rapport a la camera (1 = solidaire du monde).
export const PARALLAX = { ciel: 0.15, maisons: 0.55, facades: 1, sol: 1, premierPlan: 1 };
// Images de fond (pixels d'asset). Le ciel part de X = 0 ; les maisons sont la partie propre du panorama
// (colonnes 1060 a 3412), posees pour couvrir toute la course de la camera sans jamais montrer la zone
// de l'immeuble de gauche ni le mur du fond (X local de la premiere colonne : 572 = 0,55 x 1040).
export const SKY = { key: 'ruelle:ciel', url: 'assets/rooms/ruelle/fond/ciel.png', width: 1700, height: 420, depth: 0, x: 0 };
export const HOUSES = { key: 'ruelle:maisons', url: 'assets/rooms/ruelle/fond/maisons.png', width: 2352, height: 420, depth: 5, x: 572 };

export const LAYER_TEXTURES = [
  ...SECTIONS.flatMap((s) => SECTION_LAYERS.map((l) => ({ key: layerKey(s.folder, l.id), url: layerUrl(s.folder, l.id) }))),
  { key: SKY.key, url: SKY.url },
  { key: HOUSES.key, url: HOUSES.url },
];

// --- Sortie de secours (dessinee dans le decor, aucune image separee) -----------------

export const EXIT = { id: 'sortie_secours', x: 415, base: 1105, width: 110, height: 350 };
// Limites de marche : un peu a droite de la porte, devant le mur de fermeture (X ~ 4100).
export const WALK = { left: 330, right: 4040 };

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
    reachX: (EXIT.width / 2 + 120) * S,
  },
];

export const ruelle: RoomDefinition = {
  id: 'ruelle',
  name: 'Ruelle',
  width: roomWidth,
  height: GAME_VIEW.height,
  // Apparition par defaut (nouvelle partie directe) : devant la sortie de secours.
  spawn: { x: 640 * S, y: groundY },
  paths: [{ kind: 'floor', from: { x: WALK.left * S, y: groundY }, to: { x: WALK.right * S, y: groundY } }],
  interactables,
  heroScale,
};
