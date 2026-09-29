// Couches de profondeur communes a toutes les salles, du fond vers l'avant.
// scrollFactor < 1 : defile plus lentement que le joueur (lointain).
// scrollFactor > 1 : defile plus vite (premier plan, devant le joueur).
//
// Largeur d'une image de couche = 360 + (largeur salle - 360) x scrollFactor.
// Ex. salle de 2160 px : far = 810 px, near = 1440 px, main = 2160 px, foreground = 2700 px.
export const LAYERS = [
  { id: 'sky', scrollFactor: 0, depth: 0 },
  { id: 'far', scrollFactor: 0.25, depth: 10 },
  { id: 'near', scrollFactor: 0.6, depth: 20 },
  { id: 'main', scrollFactor: 1, depth: 30 },
  { id: 'foreground', scrollFactor: 1.3, depth: 60 },
] as const;

export type LayerId = (typeof LAYERS)[number]['id'];

// Profondeurs des elements vivants, intercalees entre 'main' et 'foreground'.
export const DEPTH = {
  interactables: 40,
  player: 50,
  markers: 55,
} as const;

export function layerWidth(roomWidth: number, viewWidth: number, scrollFactor: number): number {
  return Math.ceil(viewWidth + (roomWidth - viewWidth) * scrollFactor);
}
