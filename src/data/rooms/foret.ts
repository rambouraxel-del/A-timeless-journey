import { GAME_VIEW } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { doorGeometry, doorTextureKey } from './portes';
import { heroScale } from './ruelle';

// Foret (fin de la scene 3) : DECOR PROVISOIRE dessine par le code (ForetScene.drawPlaceholder), en attendant le
// vrai fond. Pour le remplacer : deposer l'image dans public/assets/rooms/foret/ et renseigner FOREST_IMAGE
// ci-dessous (elle est alors affichee a la place du dessin, en couvrant la hauteur de la vue).
export const FOREST_IMAGE: { key: string; url: string } | null = null;
// Exemple : { key: 'foret:fond', url: 'assets/rooms/foret/fond.png' }

// Salle de 3 vues de large ; sol a 82 % de la hauteur de la vue.
export const roomWidth = GAME_VIEW.width * 3;
export const groundY = Math.round(GAME_VIEW.height * 0.82);

// La porte du vaisseau, seule au milieu des arbres (meme taille que dans la ruelle : 205 / 724 de la vue).
export const DOOR_ID = 'porte_temps';
const doorX = GAME_VIEW.width * 0.45;
export const doorGeo = doorGeometry(doorX, groundY, (GAME_VIEW.height * 205) / 724, false);

const door: InteractableDef = {
  id: DOOR_ID,
  kind: 'door',
  label: 'Porte',
  x: doorGeo.x,
  y: doorGeo.y,
  width: doorGeo.width,
  height: doorGeo.height,
  textureKey: doorTextureKey('closed', false),
  standY: groundY,
  reachX: doorGeo.visibleWidth / 2 + 20,
};

export const foret: RoomDefinition = {
  id: 'foret',
  name: 'Forêt',
  width: roomWidth,
  height: GAME_VIEW.height,
  spawn: { x: doorX + GAME_VIEW.width * 0.25, y: groundY },
  paths: [{ kind: 'floor', from: { x: 24, y: groundY }, to: { x: roomWidth - 24, y: groundY } }],
  interactables: [door],
  heroScale, // meme taille que dans le musee et la ruelle
};

// Distance (pixels du monde) a parcourir depuis l'arrivee avant la reaction du heros.
export const DISCOVERY_STEPS = GAME_VIEW.width * 0.35;
