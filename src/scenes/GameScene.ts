/**
 * Scene de jeu.
 *
 * Version de travail : une carte unique, le personnage, le joystick et la
 * camera. Le decoupage en petites cartes reliees entre elles viendra ensuite.
 */

import Phaser from 'phaser';

import { TILESETS, TUILE, TUILES_BLOQUANTES, type TuileId } from '@/config/Assets';
import { JOYSTICK_RADIUS, type LayoutZones, computeLayout } from '@/config/Layout';
import { GAME_WIDTH, TILE_SIZE } from '@/config/Resolution';
import { SCENE } from '@/config/SceneKeys';
import { Heros } from '@/entities/Heros';
import { JoystickVirtuel } from '@/ui/JoystickVirtuel';

/** Dimensions de la carte de travail, en tuiles. */
const CARTE_LARGEUR = 30;
const CARTE_HAUTEUR = 60;

/** Ordre d'empilement des elements a l'ecran. */
const PROFONDEUR = {
  DECOR: 0,
  PERSONNAGE: 10,
  INTERFACE: 100,
} as const;

export class GameScene extends Phaser.Scene {
  private heros!: Heros;
  private joystick!: JoystickVirtuel;
  private layout!: LayoutZones;

  constructor() {
    super(SCENE.JEU);
  }

  create(): void {
    this.layout = computeLayout(this.scale.height);

    const carte = genererCarte(CARTE_LARGEUR, CARTE_HAUTEUR);
    const decor = this.creerCarte(carte);
    this.creerHeros(decor, carte);
    this.creerInterface();

    // Le joystick est detruit avec la scene, sinon ses ecouteurs d'entree
    // survivraient au changement de scene et piloteraient un personnage disparu.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.joystick.detruire());
  }

  override update(): void {
    this.heros.deplacer(this.joystick.direction);
  }

  /** Construit la carte de travail et sa couche de collision. */
  private creerCarte(donnees: TuileId[][]): Phaser.Tilemaps.TilemapLayer {
    const carte = this.make.tilemap({
      data: donnees,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const planche = carte.addTilesetImage(
      'terrain',
      TILESETS.terrain.key,
      TILE_SIZE,
      TILE_SIZE,
    );
    if (planche === null) {
      throw new Error("La planche de tuiles n'a pas pu etre associee a la carte.");
    }

    const couche = carte.createLayer(0, planche, 0, 0);
    if (couche === null) {
      throw new Error("La couche de decor n'a pas pu etre creee.");
    }

    couche.setCollision([...TUILES_BLOQUANTES]);
    couche.setDepth(PROFONDEUR.DECOR);

    this.physics.world.setBounds(0, 0, carte.widthInPixels, carte.heightInPixels);
    this.cameras.main.setBounds(0, 0, carte.widthInPixels, carte.heightInPixels);

    return couche;
  }

  private creerHeros(decor: Phaser.Tilemaps.TilemapLayer, carte: TuileId[][]): void {
    // Le croisement des deux chemins, degage par construction.
    const depart = trouverDepart(carte, 14, 20);
    this.heros = new Heros(this, depart.x, depart.y);
    this.heros.setDepth(PROFONDEUR.PERSONNAGE);

    this.physics.add.collider(this.heros, decor);

    // Le suivi amorti evite que la camera colle au pixel pres au personnage,
    // ce qui donnerait une image nerveuse a chaque changement de direction.
    this.cameras.main.startFollow(this.heros, true, 0.12, 0.12);
  }

  private creerInterface(): void {
    const { hud, joystickAnchor } = this.layout;

    this.add
      .rectangle(hud.x, hud.y, hud.width, hud.height, 0x0b0d17, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PROFONDEUR.INTERFACE);

    this.add
      .text(6, hud.y + hud.height / 2, 'EPOQUE : carte de travail', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#e8e6f0',
      })
      .setOrigin(0, 0.5)
      .setResolution(4)
      .setScrollFactor(0)
      .setDepth(PROFONDEUR.INTERFACE + 1);

    // Le joystick s'active sur toute la moitie gauche sous la barre d'etat, et
    // pas seulement sur son empreinte : le pouce n'a ainsi rien a viser.
    this.joystick = new JoystickVirtuel(
      this,
      joystickAnchor,
      {
        x: 0,
        y: hud.y + hud.height,
        width: GAME_WIDTH / 2,
        height: this.scale.height - hud.y - hud.height,
      },
      JOYSTICK_RADIUS,
      PROFONDEUR.INTERFACE + 10,
    );
  }
}

/**
 * Cherche une case libre ou faire apparaitre le personnage.
 *
 * Une position ecrite en dur devient fausse des que la carte change, et le
 * personnage se retrouve alors coince dans un arbre : la physique l'ejecte
 * lateralement, et l'obstacle lui barre la route de ce cote. On part donc de la
 * case souhaitee et on s'en eloigne en cercles jusqu'a en trouver une libre.
 *
 * Le cadre de collision etant plus etroit qu'une tuile, une seule case libre
 * suffit, a condition d'y poser les pieds au centre du bord inferieur.
 */
function trouverDepart(
  carte: TuileId[][],
  caseX: number,
  caseY: number,
): { x: number; y: number } {
  const hauteur = carte.length;
  const largeur = carte[0]?.length ?? 0;

  for (let rayon = 0; rayon < Math.max(largeur, hauteur); rayon += 1) {
    for (let dy = -rayon; dy <= rayon; dy += 1) {
      for (let dx = -rayon; dx <= rayon; dx += 1) {
        // Seul le pourtour du carre est nouveau : l'interieur a deja ete examine.
        if (rayon > 0 && Math.abs(dx) !== rayon && Math.abs(dy) !== rayon) continue;

        const x = caseX + dx;
        const y = caseY + dy;
        if (x < 0 || y < 0 || x >= largeur || y >= hauteur) continue;

        const tuile = carte[y]?.[x];
        if (tuile === undefined || TUILES_BLOQUANTES.has(tuile)) continue;

        return { x: x * TILE_SIZE + TILE_SIZE / 2, y: (y + 1) * TILE_SIZE };
      }
    }
  }

  throw new Error('Aucune case libre sur la carte.');
}

/**
 * Compose la carte de travail.
 *
 * Le relief est calcule par des regles fixes plutot que tire au hasard : la
 * carte reste ainsi identique d'un lancement a l'autre, ce qui permet de
 * comparer deux essais.
 */
function genererCarte(largeur: number, hauteur: number): TuileId[][] {
  const carte: TuileId[][] = [];

  for (let y = 0; y < hauteur; y += 1) {
    const ligne: TuileId[] = [];

    for (let x = 0; x < largeur; x += 1) {
      ligne.push(tuilePour(x, y, largeur, hauteur));
    }

    carte.push(ligne);
  }

  return carte;
}

function tuilePour(x: number, y: number, largeur: number, hauteur: number): TuileId {
  // Ceinture de rochers : delimite la carte de facon visible et infranchissable.
  if (x === 0 || y === 0 || x === largeur - 1 || y === hauteur - 1) return TUILE.ROCHER;

  // Etang, avec sa plage, dans la moitie basse.
  const distanceEtang = Math.hypot(x - 8, y - 42);
  if (distanceEtang < 4) return TUILE.EAU;
  if (distanceEtang < 6) return TUILE.SABLE;

  // Chemin en croix : deux axes degages pour tester le deplacement au long cours.
  if (x === 14 || x === 15) return TUILE.CHEMIN;
  if (y === 20 || y === 21) return TUILE.CHEMIN;

  // Obstacles disperses par une regle arithmetique, assez espaces pour laisser
  // partout des passages d'une tuile de large.
  if ((x * 7 + y * 3) % 23 === 0) return TUILE.ARBRE;
  if ((x * 5 + y * 11) % 29 === 0) return TUILE.ROCHER;

  return TUILE.HERBE;
}
