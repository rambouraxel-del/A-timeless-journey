import Phaser from 'phaser';

// Canal d'evenements entre scenes (salle <-> interface).
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  Interact: 'interact', // (def: InteractableDef)
  InteractRequest: 'interact:request', // bouton INTERAGIR : objet a portee le plus proche
  Hint: 'hint', // (texte court affiche brievement)
  DialogueOpen: 'dialogue:open', // (lines: DialogueLine[])
  DialogueClosed: 'dialogue:closed',
} as const;
