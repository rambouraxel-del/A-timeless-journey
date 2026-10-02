// Porte commune au vaisseau et au musee : deux etats (fermee, ouverte), en deux orientations.
// Image de 543 x 724 px (orientation d'origine) ; la porte visible occupe x 78..465, y 8..688 (marge transparente
// autour). Le passage lumineux est centre en x 257, y 415 et mesure environ 185 x 480.
const FRAME = { width: 543, height: 724 };
const VISIBLE = { left: 78, right: 465, top: 8, bottom: 688 };
const PASSAGE = { x: 257, y: 415, width: 185, height: 480 };

export type DoorState = 'closed' | 'open';

// Une porte dans la moitie gauche de la salle est en miroir (ouverture vers la droite, vers l'interieur) ;
// dans la moitie droite, elle garde son orientation d'origine (ouverture vers la gauche).
export const isMirrored = (centerX: number, roomWidth: number): boolean => centerX < roomWidth / 2;

// mirrored : miroir horizontal (vaisseau : ouverture vers la droite) ; sinon orientation d'origine.
export const doorTextureKey = (state: DoorState, mirrored: boolean): string => `porte:${state}${mirrored ? ':miroir' : ''}`;
export const doorTextureUrl = (state: DoorState, mirrored: boolean): string =>
  `assets/rooms/portes/porte_${state === 'closed' ? 'fermee' : 'ouverte'}${mirrored ? '_miroir' : ''}.png`;
export const DOOR_TEXTURES = [false, true].flatMap((mirrored) =>
  (['closed', 'open'] as const).map((state) => ({ key: doorTextureKey(state, mirrored), url: doorTextureUrl(state, mirrored) })),
);

export interface DoorGeometry {
  // Image complete : centre x, bas de l'image, taille d'affichage.
  x: number;
  y: number;
  width: number;
  height: number;
  // Porte visible : largeur, et ecart du bas de l'image au sol.
  visibleWidth: number;
  // Pixels du monde par pixel d'image.
  k: number;
  // Passage lumineux (centre et taille), en pixels du monde, relatifs au centre x et au bas de l'image.
  passage: { dx: number; dy: number; width: number; height: number };
}

// Pose une porte : centre x, sol (y des pieds) et hauteur visible souhaitee, en pixels du monde.
export function doorGeometry(centerX: number, floorY: number, visibleHeight: number, mirrored: boolean): DoorGeometry {
  const k = visibleHeight / (VISIBLE.bottom - VISIBLE.top);
  const left = mirrored ? FRAME.width - VISIBLE.right : VISIBLE.left;
  const right = mirrored ? FRAME.width - VISIBLE.left : VISIBLE.right;
  const centerOffset = ((left + right) / 2 - FRAME.width / 2) * k; // decalage du centre visible
  return {
    x: centerX - centerOffset,
    y: floorY + (FRAME.height - VISIBLE.bottom) * k,
    width: FRAME.width * k,
    height: FRAME.height * k,
    visibleWidth: (right - left) * k,
    k,
    passage: { dx: ((mirrored ? FRAME.width - PASSAGE.x : PASSAGE.x) - FRAME.width / 2) * k, dy: -(FRAME.height - PASSAGE.y) * k, width: PASSAGE.width * k, height: PASSAGE.height * k },
  };
}
