// Objets que le joueur peut recuperer (animation « objet obtenu », voir src/ui/ItemPickup.ts).
//
// Ajouter un objet : deposer son PNG dans assets-source/objets/, lancer `python tools/preparer-portraits.py`, ajouter
// une entree ci-dessous, puis appeler `await this.pickItem('<id>')` dans la scene (RoomScene).
export interface ItemDef {
  name: string; // nom affiche
  file: string; // public/assets/objets/<file>.png
}

export const Items = {
  cle: { name: 'Vieille clé', file: 'cle' },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof Items;

export const itemKey = (id: ItemId): string => `objet:${id}`;
export const itemUrl = (id: ItemId): string => `assets/objets/${Items[id].file}.png`;
export const ItemIds = Object.keys(Items) as ItemId[];
