import { SceneKeys } from '@/config/SceneKeys';

// Salles du jeu : identifiant de salle (sauvegardes, connexions) -> scene Phaser.
export const ROOM_SCENES = {
  vaisseau: SceneKeys.Vaisseau,
  musee: SceneKeys.Musee,
  ruelle: SceneKeys.Ruelle,
  foret: SceneKeys.Foret,
} as const;

export type RoomId = keyof typeof ROOM_SCENES;

// Une nouvelle partie commence a l'entree du musee (scene 1 du prologue).
export const DEFAULT_ROOM: RoomId = 'musee';

export function roomSceneKey(room: string): string {
  return ROOM_SCENES[room as RoomId] ?? ROOM_SCENES[DEFAULT_ROOM];
}
