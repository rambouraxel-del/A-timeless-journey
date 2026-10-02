export interface Vec2 {
  x: number;
  y: number;
}

// Chemins praticables par le joueur (il ne saute jamais).
// 'floor' : horizontal. 'stairs' : incline. 'ladder' : vertical.
export type PathKind = 'floor' | 'stairs' | 'ladder';

export interface PathSegment {
  kind: PathKind;
  from: Vec2;
  to: Vec2;
}

export type InteractableKind = 'chest' | 'door' | 'computer' | 'character' | 'object';

export interface InteractableDef {
  id: string;
  kind: InteractableKind;
  label: string;
  // Position de la base de l'objet (le sol sur lequel il repose).
  x: number;
  y: number;
  width: number;
  height: number;
  // Ou le heros se place pour interagir (par defaut : y, le sol sous l'objet).
  standY?: number;
  // Texture de l'objet (affiche origine bas-centre, largeur = width) : sert a cerner sa partie visible.
  textureKey?: string;
  // Demi-largeur de la zone ou l'interaction est possible (par defaut : width / 2 + 28).
  reachX?: number;
  // Personnage mobile : image retournee (regarde a gauche) et profondeur d'affichage de son sprite.
  flipX?: boolean;
  depth?: number;
  // Interaction secondaire (ex. personnage d'ambiance) : cede la place a une interaction de l'histoire
  // situee dans la meme direction.
  lowPriority?: boolean;
}

export interface RoomDefinition {
  id: string;
  // Nom du lieu, affiche dans les sauvegardes.
  name: string;
  width: number;
  height: number;
  spawn: Vec2;
  paths: PathSegment[];
  interactables: InteractableDef[];
  // Image par couche (cle de texture) pour les salles construites avec les couches generiques.
  layerImages?: Partial<Record<string, string>>;
  // Multiplicateur de la taille du heros dans cette salle (1 = taille de reference).
  heroScale?: number;
}
