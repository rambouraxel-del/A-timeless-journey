import { GAME_VIEW, SCREEN_WIDTH, SCREENS_PER_ROOM } from '@/config/Layout';
import type { RoomDefinition } from '@/world/RoomDefinition';

const W = SCREEN_WIDTH * SCREENS_PER_ROOM; // 2160
const GROUND = 400;
const MEZZANINE = 260;
const TOP = 125;

// Salle de test : 3 niveaux relies par 2 escaliers et 2 echelles, un objet de chaque type.
export const greyRoom: RoomDefinition = {
  id: 'grey-room',
  width: W,
  height: GAME_VIEW.height,
  spawn: { x: 120, y: GROUND },
  paths: [
    { kind: 'floor', from: { x: 16, y: GROUND }, to: { x: W - 16, y: GROUND } },
    { kind: 'stairs', from: { x: 420, y: GROUND }, to: { x: 580, y: MEZZANINE } },
    { kind: 'floor', from: { x: 580, y: MEZZANINE }, to: { x: 1000, y: MEZZANINE } },
    { kind: 'ladder', from: { x: 920, y: MEZZANINE }, to: { x: 920, y: TOP } },
    { kind: 'floor', from: { x: 920, y: TOP }, to: { x: 1180, y: TOP } },
    { kind: 'ladder', from: { x: 1260, y: GROUND }, to: { x: 1260, y: MEZZANINE } },
    { kind: 'floor', from: { x: 1260, y: MEZZANINE }, to: { x: 1700, y: MEZZANINE } },
    { kind: 'stairs', from: { x: 1700, y: MEZZANINE }, to: { x: 1860, y: GROUND } },
  ],
  interactables: [
    { id: 'chest', kind: 'chest', label: 'Coffre', x: 260, y: GROUND, width: 30, height: 22 },
    { id: 'computer', kind: 'computer', label: 'Ordinateur', x: 720, y: MEZZANINE, width: 28, height: 30 },
    { id: 'object', kind: 'object', label: 'Objet', x: 1100, y: TOP, width: 14, height: 14 },
    { id: 'npc', kind: 'character', label: 'Personnage', x: 1480, y: MEZZANINE, width: 20, height: 46 },
    { id: 'door', kind: 'door', label: 'Porte', x: 2080, y: GROUND, width: 38, height: 70 },
  ],
};
