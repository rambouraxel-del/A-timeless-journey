import { GAME_VIEW, HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import type { InteractableDef, RoomDefinition } from '@/world/RoomDefinition';
import positions from './musee/positions-tableaux.json';
import scene from './musee/scene.json';

// Galerie du musee : 6144 x 704 px d'origine (12 largeurs de 512). On l'affiche a l'echelle
// unique S = hauteur de la vue / 704, sans deformation : la vue d'un telephone montre ~0,7 largeur d'ecran d'origine.
export const WORLD_WIDTH = scene.world.width; // 6144
export const WORLD_HEIGHT = scene.world.height; // 704
export const S = GAME_VIEW.height / WORLD_HEIGHT;
export const roomWidth = WORLD_WIDTH * S;
export const groundY = scene.hero_reference.feet_y * S; // 607

// Heros : 128 px de reference dans la galerie (~116 px visibles sur ses 105 px de planche).
const HERO_VISIBLE_SHEET_PX = 105;
const HERO_VISIBLE_WORLD_PX = 116;
export const heroScale = (HERO_VISIBLE_WORLD_PX * S * RENDER_SCALE) / (HERO_VISIBLE_SHEET_PX * HERO_PIXEL_SCALE);

export const PARTS = scene.parts; // { file, x, y, width, height }
const ASSETS = 'assets/rooms/musee';
export const partKey = (file: string) => `musee:${file}`;
export const partUrl = (file: string) => `${ASSETS}/${file}`;
export const thumbKey = (id: string) => `musee:mini:${id}`;
export const thumbUrl = (id: string) => `${ASSETS}/tableaux/mini/${id}.png`;
export const largeKey = (id: string) => `musee:grand:${id}`;
export const largeUrl = (id: string) => `${ASSETS}/tableaux/${id}.png`;

// --- Oeuvres ---------------------------------------------------------------------

export interface Artwork {
  id: string;
  title: string;
  text: string; // une ou deux phrases
  guided: boolean;
  // Rectangle d'affichage dans la galerie : [x, y, largeur, hauteur] (pixels d'origine).
  rect: [number, number, number, number];
}

const TEXTS: Record<string, { title: string; text: string }> = {
  liberte: {
    title: 'La Liberté guidant le peuple',
    text: 'Eugène Delacroix, 1830. Drapeau tricolore en main, la Liberté entraîne le peuple de Paris par-dessus les barricades des Trois Glorieuses.',
  },
  radeau: {
    title: 'Le Radeau de la Méduse',
    text: 'Théodore Géricault, 1819. Les naufragés de la frégate Méduse dérivent sur un radeau de fortune, entre désespoir et espoir d’être aperçus.',
  },
  sabines: {
    title: 'Les Sabines',
    text: 'Jacques-Louis David, 1799. En plein combat, les Sabines s’interposent entre leurs pères et leurs époux pour imposer la paix.',
  },
  sacre: {
    title: 'Le Sacre de Napoléon',
    text: 'Jacques-Louis David, 1807. Le 2 décembre 1804, à Notre-Dame de Paris, Napoléon se fait sacrer empereur en présence du pape Pie VII et de toute la cour.',
  },
  officier: {
    title: 'Officier de chasseurs à cheval',
    text: 'Théodore Géricault, 1812. Un officier de la Garde impériale charge, sabre au clair, sur un cheval cabré.',
  },
  sardanapale: {
    title: 'La Mort de Sardanapale',
    text: 'Eugène Delacroix, 1827. Du haut de son lit, le roi assiste, impassible, à la destruction de ses trésors.',
  },
  odalisque: {
    title: 'La Grande Odalisque',
    text: 'Jean-Auguste-Dominique Ingres, 1814. Une odalisque alanguie sur des soieries, au dos volontairement allongé.',
  },
  oedipe: {
    title: 'Œdipe et le Sphinx',
    text: 'Jean-Auguste-Dominique Ingres, 1808. Œdipe fait face au Sphinx et s’apprête à répondre à son énigme.',
  },
  atala: {
    title: 'Atala au tombeau',
    text: 'Anne-Louis Girodet, 1808. Chactas et l’ermite déposent Atala dans sa tombe, scène tirée du roman de Chateaubriand.',
  },
};

export const ARTWORKS: Artwork[] = positions.map((p) => ({
  id: p.id,
  title: TEXTS[p.id].title,
  text: TEXTS[p.id].text,
  guided: p.guided,
  rect: p.render_rect as [number, number, number, number],
}));

// Visite guidee : ordre des etapes.
export const GUIDED_STEPS = ['liberte', 'radeau', 'sabines', 'sacre'] as const;
export const artworkById = (id: string): Artwork => {
  const art = ARTWORKS.find((a) => a.id === id);
  if (!art) throw new Error(`Oeuvre introuvable : ${id}`);
  return art;
};
// Centre horizontal d'une oeuvre, dans le monde affiche.
export const artworkCenterX = (id: string): number => (artworkById(id).rect[0] + artworkById(id).rect[2] / 2) * S;

// Le Sacre : l'ambiance musicale change a l'approche (distance en pixels d'origine avant son centre, et apres).
export const SACRE_MUSIC_BEFORE = 1100;
export const SACRE_MUSIC_AFTER = 400;

// --- Porte d'entree ----------------------------------------------------------------

// Meme dessin que la porte du vaisseau, a l'echelle du heros de la galerie.
export const DOOR = {
  id: 'porte_entree',
  textureKey: 'vaisseau:assets/props/porte_gauche.png',
  // Centre x et base y, taille d'affichage, en pixels d'origine : contre le mur, a gauche du premier tableau.
  x: 100,
  y: 600,
  width: 125,
  height: 200,
  tint: 0xdcc9ac, // teinte chaude pour s'integrer au decor du musee
};

const interactables: InteractableDef[] = [
  {
    id: DOOR.id,
    kind: 'door',
    label: 'Porte du musée',
    x: DOOR.x * S,
    y: DOOR.y * S,
    width: DOOR.width * S,
    height: DOOR.height * S,
    textureKey: DOOR.textureKey,
    standY: groundY,
    reachX: (DOOR.width / 2) * S + 24,
  },
  ...ARTWORKS.map((a): InteractableDef => {
    const [x, y, w, h] = a.rect;
    return {
      id: a.id,
      kind: 'object',
      label: a.title,
      x: (x + w / 2) * S,
      y: (y + h) * S,
      width: w * S,
      height: h * S,
      textureKey: thumbKey(a.id),
      standY: groundY,
      reachX: (w / 2) * S + 24,
    };
  }),
];

export const musee: RoomDefinition = {
  id: 'musee',
  name: 'Musée',
  width: roomWidth,
  height: GAME_VIEW.height,
  spawn: { x: 300 * S, y: groundY },
  // Un seul segment de sol, avec une marge aux extremites.
  paths: [{ kind: 'floor', from: { x: 30 * S, y: groundY }, to: { x: (WORLD_WIDTH - 30) * S, y: groundY } }],
  interactables,
  heroScale,
};
