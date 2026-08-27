/**
 * Manifeste des assets du jeu.
 *
 * Tous les fichiers graphiques sont declares ici, en un seul endroit. La scene
 * de chargement parcourt ce manifeste : ajouter un asset au jeu ne demande donc
 * jamais de toucher au code de chargement.
 *
 * Convention de nommage des cles : <categorie>_<sujet>[_<variante>].
 * Convention de nommage des fichiers : voir docs/conventions-assets.md
 */

/**
 * Construit l'URL publique d'un asset.
 *
 * Le prefixe est indispensable : en production le jeu est servi depuis un
 * sous-dossier (/A-timeless-journey/) et non depuis la racine du domaine.
 * Une URL ecrite en dur commencant par « / » y renverrait une erreur 404.
 */
export function assetUrl(cheminRelatif: string): string {
  return `${import.meta.env.BASE_URL}assets/${cheminRelatif}`;
}

/** Une planche de tuiles : une bande d'images de taille fixe. */
export interface TilesetAsset {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

/** Une planche d'animation : une grille d'images de taille fixe. */
export interface SpritesheetAsset {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

/**
 * Identifiants des tuiles dans la planche de terrain.
 *
 * Ces index correspondent a la position de chaque tuile dans le fichier PNG.
 * Ils sont ecrits dans les cartes : ne jamais reordonner la planche sans
 * mettre a jour les cartes existantes.
 */
export const TUILE = {
  HERBE: 0,
  CHEMIN: 1,
  SABLE: 2,
  EAU: 3,
  ROCHER: 4,
  ARBRE: 5,
  SOL_VAISSEAU: 6,
  MUR_VAISSEAU: 7,
} as const;

export type TuileId = (typeof TUILE)[keyof typeof TUILE];

/**
 * Tuiles qui bloquent le passage du joueur.
 *
 * Definir la collision au niveau de la tuile plutot que carte par carte evite
 * d'avoir a redessiner les obstacles dans chaque nouvelle carte.
 */
export const TUILES_BLOQUANTES: ReadonlySet<number> = new Set<number>([
  TUILE.EAU,
  TUILE.ROCHER,
  TUILE.ARBRE,
  TUILE.MUR_VAISSEAU,
]);

export const TILESETS = {
  terrain: {
    key: 'tileset_terrain',
    path: 'tilesets/placeholder_terrain.png',
    frameWidth: 16,
    frameHeight: 16,
  },
} as const satisfies Record<string, TilesetAsset>;

export const SPRITESHEETS = {
  heros: {
    key: 'sprite_heros',
    path: 'sprites/heros.png',
    frameWidth: 32,
    frameHeight: 48,
  },
} as const satisfies Record<string, SpritesheetAsset>;

/**
 * Cadre de collision du heros, en pixels, mesure depuis le coin superieur
 * gauche de son image.
 *
 * La collision ne porte que sur les pieds, pas sur toute l'image : le
 * personnage fait deux tuiles de large et trois de haut, mais son emprise au
 * sol tient dans une seule tuile. Sans cela, il ne pourrait pas emprunter un
 * passage d'une tuile de large, alors que le decor en est fait.
 */
export const COLLISION_HEROS = {
  largeur: 14,
  hauteur: 10,
  decalageX: (32 - 14) / 2,
  decalageY: 48 - 10,
} as const;
