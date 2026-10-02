// Porte commune au vaisseau et au musee : deux etats (fermee, ouverte), en deux orientations.
// Image de 192 x 256 px ; la porte visible occupe x 39..152, y 20..244 (marge transparente autour).
const FRAME = { width: 192, height: 256 };
const VISIBLE = { left: 39, right: 152, top: 20, bottom: 244 };

export type DoorState = 'closed' | 'open';

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
    passage: { dx: centerOffset, dy: -(FRAME.height - 135) * k, width: 66 * k, height: 170 * k },
  };
}
