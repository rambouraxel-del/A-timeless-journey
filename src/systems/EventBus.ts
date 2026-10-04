import Phaser from 'phaser';

// Canal d'evenements entre scenes (salle <-> interface).
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  SaveRequest: 'save:request', // demande une sauvegarde immediate (ex. retour au menu)
  Interact: 'interact', // (def: InteractableDef)
  InteractRequest: 'interact:request', // bouton INTERAGIR : objet a portee le plus proche
  Hint: 'hint', // (texte court affiche brievement)
  DialogueOpen: 'dialogue:open', // (lines: DialogueLine[])
  ArtworkOpen: 'artwork:open', // (artwork: ArtworkView) : oeuvre en grand + dialogue
  DialogueClosed: 'dialogue:closed',
  ConsoleOpen: 'console:open', // (screen: ConsoleScreen, broken: boolean) : console du vaisseau en plein ecran
  ConsoleClosed: 'console:closed', // (result: 'action' | 'close')
} as const;

// Oeuvre a examiner en grand : image (chargee a la demande) et textes affiches dans le dialogue.
export interface ArtworkView {
  key: string; // cle de texture
  url: string; // chemin dans public/
  lines: { speaker?: string; text: string }[];
}
