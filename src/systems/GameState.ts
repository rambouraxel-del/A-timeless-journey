import { DEFAULT_ROOM } from '@/data/rooms/registry';
import { newStory, type SaveData, type StoryData, type VisitData } from './SaveGame';

// Etat de la partie en cours, conserve quand on change de salle : salle courante, temps de jeu,
// visite du musee et progression narrative. Ecrit dans la sauvegarde manuelle.
export const gameState = {
  room: DEFAULT_ROOM as string,
  // Scene Phaser de la salle courante (le menu Pause la suspend).
  sceneKey: 'Musee' as string,
  playTime: 0,
  visit: { step: 0, examined: [] } as VisitData,
  story: newStory() as StoryData,
};

// Nouvelle partie (save = null) ou reprise d'une sauvegarde.
export function startGameState(save: SaveData | null): void {
  gameState.room = save?.room ?? DEFAULT_ROOM;
  gameState.playTime = save?.playTime ?? 0;
  gameState.visit = save ? { step: save.visit.step, examined: [...save.visit.examined] } : { step: 0, examined: [] };
  gameState.story = save ? { ...save.story, presentations: [...save.story.presentations] } : newStory();
}
