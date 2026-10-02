import Phaser from 'phaser';
import { RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import {
  ARTWORKS,
  artworkById,
  artworkCenterX,
  DOOR,
  doorGeo,
  doorMirrored,
  GUIDED_STEPS,
  largeKey,
  largeUrl,
  musee,
  npcDefs,
  PARTS,
  partKey,
  S,
  SACRE_MUSIC_AFTER,
  SACRE_MUSIC_BEFORE,
  thumbKey,
} from '@/data/rooms/musee';
import { Door } from '@/entities/Door';
import { depthForFeet, MuseeCrowd } from '@/entities/MuseeCrowd';
import { controls } from '@/systems/Controls';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { gameState } from '@/systems/GameState';
import { Music } from '@/systems/Music';
import { DEPTH } from '@/world/Layers';
import type { InteractableDef } from '@/world/RoomDefinition';
import { RoomScene } from './RoomScene';

// Salle du musee : galerie de 12 largeurs d'ecran, neuf tableaux a examiner, visite guidee en
// quatre etapes et porte d'entree reliee a une autre salle (connections.ts).
export class MuseeScene extends RoomScene {
  protected readonly room = musee;
  private crowd!: MuseeCrowd;

  constructor() {
    super(SceneKeys.Musee);
  }

  create(): void {
    super.create();
    // Rappel de l'etape en cours a l'arrivee.
    this.time.delayedCall(900, () => {
      const step = gameState.visit.step;
      if (step < GUIDED_STEPS.length) EventBus.emit(GameEvents.Hint, `Visite : étape ${step + 1}/4 — ${artworkById(GUIDED_STEPS[step]).title}`);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => Music.play(null));
  }

  protected buildScenery(): void {
    // Quatre parties de 1536 px, sans raccord : chacune s'arrete la ou commence la suivante.
    PARTS.forEach((part, i) => {
      const left = Math.round(part.x * S * RENDER_SCALE) / RENDER_SCALE;
      const next = i + 1 < PARTS.length ? Math.round(PARTS[i + 1].x * S * RENDER_SCALE) / RENDER_SCALE : this.room.width;
      this.add
        .image(left, 0, partKey(part.file))
        .setOrigin(0, 0)
        .setDisplaySize(next - left + (i + 1 < PARTS.length ? 1 / RENDER_SCALE : 0), part.height * S)
        .setDepth(30);
    });

    // Porte d'entree (voir Door) : au niveau des equipements, le heros passe devant.
    this.doors.set(DOOR.id, new Door(this, doorGeo, doorMirrored));

    // Tableaux : objets separes du decor, a leur rectangle d'affichage.
    for (const art of ARTWORKS) {
      const [x, y, w, h] = art.rect;
      const image = this.add.image((x + w / 2) * S, (y + h) * S, thumbKey(art.id)).setOrigin(0.5, 1).setDisplaySize(w * S, h * S).setDepth(DEPTH.interactables);
      image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // reduction douce de l'image
    }

    // Personnages d'ambiance (leurs zones d'interaction sont enregistrees ensuite par RoomScene).
    this.crowd = new MuseeCrowd(this, (id) => {
      const def = npcDefs.get(id);
      if (def) this.interactions?.relocate(def);
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (!controls.locked) this.crowd.update(time, this.cameras.main.scrollX);
    // Ordre d'affichage selon les pieds : le heros (sol) passe devant ou derriere les personnages.
    this.player.sprite.setDepth(depthForFeet(this.player.position.y));
    // Ambiance : la musique change a l'approche du Sacre.
    const x = this.player.position.x / S;
    const sacreX = artworkCenterX('sacre') / S;
    Music.play(x > sacreX - SACRE_MUSIC_BEFORE && x < sacreX + SACRE_MUSIC_AFTER ? 'sacre' : 'galerie');
  }

  protected onInteract(def: InteractableDef): void {
    const lines = this.crowd.linesFor(def.id);
    if (lines) {
      // Personnage : il se tourne vers le heros et dit quelques mots.
      controls.dirty = true;
      this.crowd.faceToward(def.id, this.player.position.x);
      EventBus.emit(GameEvents.DialogueOpen, lines);
      return;
    }
    const art = ARTWORKS.find((a) => a.id === def.id);
    if (!art) {
      super.onInteract(def);
      return;
    }
    controls.dirty = true;
    const visit = gameState.visit;
    if (!visit.examined.includes(art.id)) visit.examined.push(art.id);
    // Etape guidee en cours examinee : le groupe passe aussitot a l'etape suivante, pendant que
    // l'oeuvre ouverte masque la salle.
    if (GUIDED_STEPS[visit.step] === art.id) {
      visit.step++;
      this.crowd.placeGroup();
    }
    EventBus.emit(GameEvents.ArtworkOpen, { key: largeKey(art.id), url: largeUrl(art.id), lines: [{ speaker: art.title, text: art.text }] });
  }
}
