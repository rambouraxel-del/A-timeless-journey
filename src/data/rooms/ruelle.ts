import { GAME_VIEW, HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import manifest from './ruelle/manifest.json';

// Ruelle du Louvre (pack Ruelle-pack-complet) : monde de 5397 x 1448 px d'asset, 12 images. Echelle unique
// S = hauteur de la vue / 1448 : aucune deformation. Les coordonnees du manifeste sont en pixels d'asset ;
// position ecran = (X asset - camera X x facteur) x S.
export const WORLD_WIDTH = manifest.world.width; // 5397
export const WORLD_HEIGHT = manifest.world.height; // 1448
export const S = GAME_VIEW.height / WORLD_HEIGHT;
export const roomWidth = WORLD_WIDTH * S;
// Pieds du heros et base des facades : Y = 1168.
export const groundY = manifest.world.feetY * S;

// Heros a la meme taille que dans le musee (116 px de galerie sur 704 de haut).
const HERO_VISIBLE_SHEET_PX = 105;
const HERO_VISIBLE_LOGICAL = 116 * (GAME_VIEW.height / 704);
export const heroScale = (HERO_VISIBLE_LOGICAL * RENDER_SCALE) / (HERO_VISIBLE_SHEET_PX * HERO_PIXEL_SCALE);

// --- Couches ----------------------------------------------------------------------

// Ordre : fond bleu, ciel, batiments lointains, sol, facades, puis heros (50). Les profondeurs sont reprises du
// manifeste par couche ; les facteurs de defilement aussi (ciel 0,15 ; batiments 0,65 ; sol et facades 1).
export const SKY_COLOR = 0x52adf2;
export const LAYER_DEPTH: Record<string, number> = { ciel: 0, batiments: 5, sol: 15, facades: 20 };
export interface RuelleImage {
  key: string;
  url: string;
  layer: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  parallax: l.parallax,
}));

// --- Sortie de secours : dessinee dans le decor (facades-01), porte statique -----------

// Zone d'interaction calee sur la porte : centre x, pied (Y = 1168), taille.
export const EXIT = { id: 'sortie_secours', x: 380, base: 1168, width: 120, height: 330 };
// Limites de marche : angle du mur de retour a droite (X ~ 5105 dans le decor), moins le volume du heros.
export const WALK = { left: 130, right: 5000 };

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
  spawn: { x: 620 * S, y: groundY },
  paths: [{ kind: 'floor', from: { x: WALK.left * S, y: groundY }, to: { x: WALK.right * S, y: groundY } }],
  interactables,
  heroScale,
};
