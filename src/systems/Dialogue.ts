// Une replique. Les dialogues du jeu seront des listes de DialogueLine rangees dans src/data/dialogues/.
export interface DialogueLine {
  speaker?: string;
  text: string;
  // Cle de texture du portrait affiche a gauche (optionnel).
  portrait?: string;
  // Pensee du heros : affichee dans une autre couleur.
  thought?: boolean;
}
