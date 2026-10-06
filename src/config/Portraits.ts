// Portraits de dialogue (fenetre a gauche de la boite de texte).
//
// Ajouter un personnage : deposer son PNG dans assets-source/portraits/, lancer `python tools/preparer-portraits.py`,
// puis ajouter une entree ci-dessous. La cle est l'identifiant d'interlocuteur des fichiers de dialogues
// (`qui` dans src/data/dialogues/*.json). Chaque personnage a un portrait "default" et, au besoin, des variantes
// (blesse, ...) choisies par un champ `"portrait": "<variante>"` sur la replique.
// Pas de portrait pour la narration (replique sans `qui`) ni pour les messages du vaisseau (`systeme`).
export const Portraits: Record<string, Record<string, string>> = {
  heros: { default: 'heros' },
  professeur: { default: 'professeur' },
  mysterieux: { default: 'mysterieux', blesse: 'mysterieux-blesse' },
};

export const portraitKey = (file: string): string => `portrait:${file}`;
export const portraitUrl = (file: string): string => `assets/portraits/${file}.png`;

// Fichiers a charger (sans doublon).
export const PortraitFiles: string[] = [...new Set(Object.values(Portraits).flatMap((variants) => Object.values(variants)))];

// Cle de texture du portrait d'un interlocuteur (undefined : pas de portrait).
export function portraitFor(who: string | undefined, variant = 'default'): string | undefined {
  if (!who) return undefined;
  const set = Portraits[who];
  const file = set?.[variant] ?? set?.default;
  return file ? portraitKey(file) : undefined;
}
