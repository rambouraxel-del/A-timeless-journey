import Phaser from 'phaser';
import { Assets, HeroFrames } from '@/config/Assets';
import { HERO_PIXEL_SCALE, RENDER_SCALE } from '@/config/Layout';
import { SceneKeys } from '@/config/SceneKeys';
import {
  ARTWORKS,
  artworkById,
  artworkCenterX,
  DOOR,
  GUIDED_STEPS,
  heroScale,
  largeKey,
  largeUrl,
  musee,
  PARTS,
  partKey,
  S,
  SACRE_MUSIC_AFTER,
  SACRE_MUSIC_BEFORE,
  thumbKey,
} from '@/data/rooms/musee';
import { controls } from '@/systems/Controls';
import { EventBus, GameEvents } from '@/systems/EventBus';
import { gameState } from '@/systems/GameState';
import { Music } from '@/systems/Music';
import { DEPTH } from '@/world/Layers';
import type { InteractableDef } from '@/world/RoomDefinition';
import { RoomScene } from './RoomScene';

// Etudiants du groupe : le heros recolore, un peu plus petits. Decalage (px d'origine) autour du centre du tableau.
const STUDENTS = [
  { dx: -78, tint: 0xd0dcff, scale: 0.92 },
  { dx: -40, tint: 0xffd8c8, scale: 0.86 },
  { dx: 44, tint: 0xd4f0d0, scale: 0.9 },
];

// Salle du musee : galerie de 12 largeurs d'ecran, neuf tableaux a examiner, visite guidee en
// quatre etapes et porte d'entree reliee a une autre salle (connections.ts).
export class MuseeScene extends RoomScene {
  protected readonly room = musee;
  private students: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super(SceneKeys.Musee);
  }

  create(): void {
    super.create();
    this.createStudents();
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

    // Porte d'entree (dessin de la porte du vaisseau), posee contre le mur.
    this.add
      .image(DOOR.x * S, DOOR.y * S, DOOR.textureKey)
      .setOrigin(0.5, 1)
      .setDisplaySize(DOOR.width * S, DOOR.height * S)
      .setTint(DOOR.tint)
      .setDepth(DEPTH.interactables);

    // Tableaux : objets separes du decor, a leur rectangle d'affichage.
    for (const art of ARTWORKS) {
      const [x, y, w, h] = art.rect;
      const image = this.add.image((x + w / 2) * S, (y + h) * S, thumbKey(art.id)).setOrigin(0.5, 1).setDisplaySize(w * S, h * S).setDepth(DEPTH.interactables);
      image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // reduction douce de l'image
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    // Ambiance : la musique change a l'approche du Sacre.
    const x = this.player.position.x / S;
    const sacreX = artworkCenterX('sacre') / S;
    Music.play(x > sacreX - SACRE_MUSIC_BEFORE && x < sacreX + SACRE_MUSIC_AFTER ? 'sacre' : 'galerie');
  }

  protected onInteract(def: InteractableDef): void {
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
      this.placeStudents();
    }
    EventBus.emit(GameEvents.ArtworkOpen, { key: largeKey(art.id), url: largeUrl(art.id), lines: [{ speaker: art.title, text: art.text }] });
  }

  // --- Groupe d'etudiants ---------------------------------------------------------

  private createStudents(): void {
    const scale = (HERO_PIXEL_SCALE * heroScale) / RENDER_SCALE;
    this.students = STUDENTS.map((s) =>
      this.add
        .sprite(0, this.room.spawn.y, Assets.hero.key, HeroFrames.idleRight.start)
        .setOrigin(0.5, Assets.hero.feetY / Assets.hero.frameHeight)
        .setScale(scale * s.scale)
        .setTint(s.tint)
        .setDepth(DEPTH.player - 1),
    );
    this.placeStudents();
  }

  // Devant l'etape active (devant le Sacre une fois la visite terminee).
  private placeStudents(): void {
    const target = GUIDED_STEPS[Math.min(gameState.visit.step, GUIDED_STEPS.length - 1)];
    const cx = artworkCenterX(target);
    this.students.forEach((sprite, i) => {
      sprite.x = cx + STUDENTS[i].dx * S;
      sprite.setFrame(STUDENTS[i].dx < 0 ? HeroFrames.idleRight.start : HeroFrames.idleLeft.start);
    });
  }
}
