import type { RoomId } from './registry';

// Liaisons entre portes de salles differentes. Chaque liaison fonctionne dans les deux sens.
// A modifier ici seulement : la liaison musee <-> vaisseau est provisoire (developpement).
export interface DoorRef {
  room: RoomId;
  door: string; // id de l'objet-porte dans la salle
}

export const DOOR_LINKS: [DoorRef, DoorRef][] = [
  [
    { room: 'vaisseau', door: 'porte_droite' },
    { room: 'musee', door: 'porte_entree' },
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
