import type { Vec2 } from '@/world/RoomDefinition';

// Etat des commandes partage entre la scene UI (qui l'ecrit) et la salle (qui le lit).
// move : vecteur du joystick, x vers la droite, y vers le bas, longueur 0 a 1.
// locked : vrai pendant un dialogue ou un menu, le joueur ne bouge plus.
export const controls: { move: Vec2; locked: boolean } = {
  move: { x: 0, y: 0 },
  locked: false,
};
