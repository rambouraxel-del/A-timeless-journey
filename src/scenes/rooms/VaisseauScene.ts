import { SceneKeys } from '@/config/SceneKeys';
import { layers, propScale, props, sx, sy, textureKey, vaisseau } from '@/data/rooms/vaisseau';
import { getSettings } from '@/systems/SaveGame';
import { addVaisseauEffects } from './vaisseauEffects';
import { RoomScene } from './RoomScene';

// Salle du vaisseau : assemble les panneaux du pack (fond, structure, rebord, premier plan)
// et ses equipements, aux profondeurs prevues par scene.json. Le heros (50) passe devant les
// equipements (40) et derriere le rebord (60) et les angles proches (70).
export class VaisseauScene extends RoomScene {
  protected readonly room = vaisseau;

  constructor() {
    super(SceneKeys.Vaisseau);
  }

  protected buildScenery(): void {
    for (const layer of layers) {
      const image = this.add
        .image(layer.x * sx, layer.y * sy, textureKey(layer.file))
        .setOrigin(layer.origin[0], layer.origin[1])
        // Chaque panneau remplit exactement une largeur de vue : 4 panneaux = 4 ecrans.
        .setDisplaySize(layer.width * sx, layer.height * sy)
        .setDepth(layer.depth)
        .setScrollFactor(layer.scrollFactor);
      // Parallaxe legere du premier plan proche (scrollFactor > 1) : le panneau est recale pour
      // etre parfaitement aligne quand la camera est centree dessus, donc aux deux extremites.
      if (layer.scrollFactor !== 1) image.x += (layer.scrollFactor - 1) * layer.x * sx;
    }

    for (const prop of props) {
      this.add
        .image(prop.x * sx, prop.y * sy, textureKey(prop.file))
        .setOrigin(prop.origin[0], prop.origin[1])
        .setScale(propScale)
        .setDepth(prop.depth)
        .setScrollFactor(prop.scrollFactor);
    }

    if (getSettings().ambient) addVaisseauEffects(this);
  }
}
