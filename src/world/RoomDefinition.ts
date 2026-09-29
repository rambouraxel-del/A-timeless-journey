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
}

export interface RoomDefinition {
  id: string;
  width: number;
  height: number;
  spawn: Vec2;
  paths: PathSegment[];
  interactables: InteractableDef[];
  // Image par couche (cle de texture). Une couche sans image est dessinee par la scene (salle grise).
  layerImages?: Partial<Record<string, string>>;
}
