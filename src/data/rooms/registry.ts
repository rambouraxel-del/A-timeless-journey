import { SceneKeys } from '@/config/SceneKeys';

// Salles du jeu : identifiant de salle (sauvegardes, connexions) -> scene Phaser.
export const ROOM_SCENES = {
  vaisseau: SceneKeys.Vaisseau,
  musee: SceneKeys.Musee,
  ruelle: SceneKeys.Ruelle,
} as const;

export type RoomId = keyof typeof ROOM_SCENES;

export const DEFAULT_ROOM: RoomId = 'vaisseau';

export function roomSceneKey(room: string): string {
  return ROOM_SCENES[room as RoomId] ?? ROOM_SCENES[DEFAULT_ROOM];
}
