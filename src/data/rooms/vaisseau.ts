import { GAME_VIEW } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import { doorGeometry, DOOR_TEXTURES, doorTextureKey, isMirrored } from './portes';
import manifest from './vaisseau/scene.json';

// Salle du vaisseau : 4 ecrans de long, un seul niveau. Les coordonnees du manifeste (scene.json)
// sont en pixels de texture sur une salle de 2880 x 1080 ; on les adapte a la vue du telephone :
//   x -> x * sx   y -> y * sy   objets : taille x min(sx, sy) (jamais etires), pieds au sol.
export const SECTION_TEXTURE_WIDTH = manifest.room.sectionWidth; // 720
export const ROOM_TEXTURE_HEIGHT = manifest.room.height; // 1080

export const sx = GAME_VIEW.width / SECTION_TEXTURE_WIDTH;
export const sy = GAME_VIEW.height / ROOM_TEXTURE_HEIGHT;
export const propScale = Math.min(sx, sy);
export const groundY = manifest.room.floorY * sy;
export const roomWidth = manifest.room.screens * GAME_VIEW.width;

export type SceneElement = (typeof manifest.layers)[number];
export type SceneProp = (typeof manifest.props)[number];

export const layers: SceneElement[] = manifest.layers;
// Les deux portes d'origine du pack sont remplacees : une seule porte, a gauche (voir portes.ts).
export const props: SceneProp[] = manifest.props.filter((p) => p.id !== 'porte_gauche' && p.id !== 'porte_droite');
export { DOOR_TEXTURES };
export const effects = manifest.effects;

// Cle de texture Phaser d'un fichier du pack (ex. "assets/props/console.png").
export const textureKey = (file: string): string => `vaisseau:${file}`;
// Chemin du fichier dans public/ (le pack est range dans public/assets/rooms/vaisseau/).
export const textureUrl = (file: string): string => `assets/rooms/vaisseau/${file.replace(/^assets\//, '')}`;

export const propById = (id: string): SceneProp => {
  const prop = manifest.props.find((p) => p.id === id);
  if (!prop) throw new Error(`Objet introuvable dans scene.json : ${id}`);
  return prop;
};

// Zones d'interaction (scene 3) : seulement l'armoire, le sablier temporel (gros reacteur central), la console
// et la porte. Les autres equipements sont du decor. Reactions : VaisseauScene.ts.
export const CABINET_ID = 'armoire_haute';
export const HOURGLASS_ID = 'reacteur';
export const CONSOLE_ID = 'console';
const INTERACTABLES: { id: string; kind: InteractableDef['kind']; label: string }[] = [
  { id: CABINET_ID, kind: 'chest', label: 'Armoire' },
  { id: HOURGLASS_ID, kind: 'object', label: 'Sablier temporel' },
  { id: CONSOLE_ID, kind: 'computer', label: 'Console' },
];

// Porte a gauche (ancienne porte gauche) : en miroir selon sa position, le battant s'ouvre vers l'interieur de la salle.
// Meme position, meme hauteur que l'ancienne porte du pack.
export const DOOR_ID = 'porte_gauche';
export const porteMirrored = isMirrored(160 * sx, roomWidth);
export const porteGeo = doorGeometry(160 * sx, groundY, 360 * propScale, porteMirrored);

function doorInteractable(): InteractableDef {
  return {
    id: DOOR_ID,
    kind: 'door',
    label: 'Porte',
    x: porteGeo.x,
    y: porteGeo.y,
    width: porteGeo.width,
    height: porteGeo.height,
    textureKey: doorTextureKey('closed', porteMirrored),
    standY: groundY,
    reachX: porteGeo.visibleWidth / 2 + 24,
  };
}

function interactableFor(entry: (typeof INTERACTABLES)[number]): InteractableDef {
  const prop = propById(entry.id);
  const width = prop.width * propScale;
  const interaction = 'interaction' in prop ? prop.interaction : undefined;
  return {
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    x: prop.x * sx,
    y: prop.y * sy,
    width,
    height: prop.height * propScale,
    // Le heros interagit debout sur le sol, meme pour l'ecran fixe au mur.
    textureKey: textureKey(prop.file),
    standY: groundY,
    // Zone de declenchement : la moitie de l'objet + une marge (au moins le rayon du manifeste).
    reachX: Math.max(width / 2 + 24, (interaction?.radius ?? 0) * sx),
  };
}

export const vaisseau: RoomDefinition = {
  id: manifest.scene,
  name: 'Vaisseau',
  width: roomWidth,
  height: GAME_VIEW.height,
  spawn: { x: manifest.room.spawn.x * sx, y: groundY },
  // Un seul segment de sol (marge de 64 px de texture aux extremites pour que le heros ne soit pas rogne) : ni escalier ni echelle.
  paths: [{ kind: 'floor', from: { x: 64 * sx, y: groundY }, to: { x: 2816 * sx, y: groundY } }],
  interactables: [doorInteractable(), ...INTERACTABLES.map(interactableFor)],
  // Les equipements sont peints a grande echelle : le heros est agrandi x1,3 dans cette salle.
  heroScale: 1.3,
};
