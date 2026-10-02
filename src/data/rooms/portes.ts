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

// Sortie de secours du musee (image de 512 x 768, panneau fleche vers la droite : jamais en miroir) :
// la porte visible occupe x 105..407, y 50..712, panneau vert compris.
export const EXIT_SPRITE = { frame: { width: 512, height: 768 }, visible: { left: 105, right: 407, top: 50, bottom: 712 } };
export const EXIT_TEXTURE = { key: 'porte:sortie_secours', url: 'assets/rooms/portes/sortie_secours.png' };
DOOR_TEXTURES.push(EXIT_TEXTURE);

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
export function doorGeometry(
  centerX: number,
  floorY: number,
  visibleHeight: number,
  mirrored: boolean,
  sprite: { frame: { width: number; height: number }; visible: { left: number; right: number; top: number; bottom: number } } = { frame: FRAME, visible: VISIBLE },
): DoorGeometry {
  const { frame, visible } = sprite;
  const k = visibleHeight / (visible.bottom - visible.top);
  const left = mirrored ? frame.width - visible.right : visible.left;
  const right = mirrored ? frame.width - visible.left : visible.right;
  const centerOffset = ((left + right) / 2 - frame.width / 2) * k; // decalage du centre visible
  return {
    x: centerX - centerOffset,
    y: floorY + (frame.height - visible.bottom) * k,
    width: frame.width * k,
    height: frame.height * k,
    visibleWidth: (right - left) * k,
    k,
    passage: { dx: ((mirrored ? frame.width - PASSAGE.x : PASSAGE.x) - frame.width / 2) * k, dy: -(frame.height - PASSAGE.y) * k, width: PASSAGE.width * k, height: PASSAGE.height * k },
  };
}
