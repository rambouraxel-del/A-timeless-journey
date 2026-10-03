import type { RoomId } from './registry';

// Liaisons entre portes de salles differentes. Chaque liaison fonctionne dans les deux sens.
// A modifier ici seulement. Les conditions d'usage (porte verrouillee, cle...) sont dans les scenes.
export interface DoorRef {
  room: RoomId;
  door: string; // id de l'objet-porte dans la salle
}

export const DOOR_LINKS: [DoorRef, DoorRef][] = [
  // Scene 1 -> 2 : l'issue de secours du musee debouche dans la ruelle (elle ne se rouvre pas de l'exterieur).
  [
    { room: 'musee', door: 'sortie_secours' },
    { room: 'ruelle', door: 'sortie_secours' },
  ],
  // Scene 2 : la porte impossible de la ruelle mene a la porte du vaisseau.
  [
    { room: 'ruelle', door: 'porte_temps' },
    { room: 'vaisseau', door: 'porte_gauche' },
  ],
];

// Destination de l'autre cote d'une porte (null si la porte n'est reliee a rien).
export function destinationOf(room: string, door: string): DoorRef | null {
  for (const [a, b] of DOOR_LINKS) {
    if (a.room === room && a.door === door) return b;
    if (b.room === room && b.door === door) return a;
  }
  return null;
}
