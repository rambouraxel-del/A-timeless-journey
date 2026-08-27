/**
 * Joystick digital tactile.
 *
 * Le joystick est flottant : il apparait la ou le pouce se pose, au lieu
 * d'attendre le doigt a un emplacement fixe. Sur telephone, c'est ce qui fait
 * la difference entre une direction que l'on donne sans regarder et une pastille
 * qu'il faut viser des yeux. Une empreinte discrete reste affichee au repos pour
 * indiquer ou se trouve la zone active.
 *
 * Le joystick suit un seul doigt, identifie a l'appui : un second doigt pose
 * ailleurs (bouton d'action, carte) ne perturbe donc pas le deplacement.
 */

import Phaser from 'phaser';

import type { Point, Zone } from '@/config/Layout';

/** Couleur des cercles du joystick. */
const COULEUR = 0x6bd6c4;

/** Opacite de l'empreinte affichee quand aucun doigt ne touche l'ecran. */
const OPACITE_REPOS = 0.25;

/** Opacite du joystick pendant l'utilisation. */
const OPACITE_ACTIF = 0.75;

/**
 * Part du rayon en dessous de laquelle la direction est ignoree.
 *
 * Un pouce pose n'est jamais parfaitement immobile. Sans cette zone morte, le
 * personnage part tout seul des que le doigt effleure l'ecran.
 */
const ZONE_MORTE = 0.2;

/** Rayon du bouton mobile, en proportion du rayon du socle. */
const PROPORTION_BOUTON = 0.42;

/** Marge minimale entre le socle du joystick et le bord de l'ecran. */
const MARGE_BORD = 4;

export interface DirectionJoystick {
  /** Composante horizontale, de -1 (gauche) a 1 (droite). */
  readonly x: number;
  /** Composante verticale, de -1 (haut) a 1 (bas). */
  readonly y: number;
  /** Intensite de la poussee, de 0 (repos) a 1 (a fond). */
  readonly intensite: number;
}

const REPOS: DirectionJoystick = { x: 0, y: 0, intensite: 0 };

export class JoystickVirtuel {
  private readonly socle: Phaser.GameObjects.Arc;
  private readonly bouton: Phaser.GameObjects.Arc;

  /** Identifiant du doigt qui pilote le joystick, ou null si aucun. */
  private doigt: number | null = null;

  private directionCourante: DirectionJoystick = REPOS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ancreRepos: Point,
    private readonly zoneActive: Zone,
    private readonly rayon: number,
    profondeur: number,
  ) {
    this.socle = scene.add
      .circle(ancreRepos.x, ancreRepos.y, rayon, COULEUR, 0.12)
      .setStrokeStyle(1, COULEUR, OPACITE_REPOS)
      .setScrollFactor(0)
      .setDepth(profondeur);

    this.bouton = scene.add
      .circle(ancreRepos.x, ancreRepos.y, rayon * PROPORTION_BOUTON, COULEUR, OPACITE_REPOS)
      .setScrollFactor(0)
      .setDepth(profondeur + 1);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.auContact, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.auDeplacement, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.auRelachement, this);
    // Un doigt qui quitte la surface tactile par le bord n'emet pas d'evenement
    // de relachement : sans ce filet, le personnage continuerait d'avancer seul.
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.auRelachement, this);
  }

  /** Direction demandee par le joueur. Vecteur nul quand le joystick est au repos. */
  get direction(): DirectionJoystick {
    return this.directionCourante;
  }

  /** Detache les ecouteurs. A appeler quand la scene se termine. */
  detruire(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.auContact, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.auDeplacement, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.auRelachement, this);
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.auRelachement,
      this,
    );
    this.socle.destroy();
    this.bouton.destroy();
  }

  private auContact(pointer: Phaser.Input.Pointer): void {
    if (this.doigt !== null || !this.dansZoneActive(pointer)) return;

    this.doigt = pointer.id;

    // Le socle se pose sous le doigt, en restant entierement visible a l'ecran.
    const x = Phaser.Math.Clamp(
      pointer.x,
      this.rayon + MARGE_BORD,
      this.scene.scale.width - this.rayon - MARGE_BORD,
    );
    const y = Phaser.Math.Clamp(
      pointer.y,
      this.rayon + MARGE_BORD,
      this.scene.scale.height - this.rayon - MARGE_BORD,
    );

    this.socle.setPosition(x, y).setAlpha(1);
    this.socle.setStrokeStyle(1, COULEUR, OPACITE_ACTIF);
    this.bouton.setPosition(x, y).setFillStyle(COULEUR, OPACITE_ACTIF);
  }

  private auDeplacement(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.doigt) return;

    const ecartX = pointer.x - this.socle.x;
    const ecartY = pointer.y - this.socle.y;
    const distance = Math.hypot(ecartX, ecartY);

    // Le bouton ne sort jamais du socle, meme si le doigt s'en eloigne : la
    // direction continue d'etre lue, seule l'intensite est plafonnee.
    const distanceBouton = Math.min(distance, this.rayon);
    if (distance > 0) {
      this.bouton.setPosition(
        this.socle.x + (ecartX / distance) * distanceBouton,
        this.socle.y + (ecartY / distance) * distanceBouton,
      );
    }

    const intensite = distance / this.rayon;
    if (intensite < ZONE_MORTE || distance === 0) {
      this.directionCourante = REPOS;
      return;
    }

    // L'intensite est reetalee depuis le bord de la zone morte : la poussee
    // repart de zero au lieu de sauter brutalement a 20 %.
    const intensiteUtile = Math.min((intensite - ZONE_MORTE) / (1 - ZONE_MORTE), 1);

    this.directionCourante = {
      x: ecartX / distance,
      y: ecartY / distance,
      intensite: intensiteUtile,
    };
  }

  private auRelachement(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.doigt) return;

    this.doigt = null;
    this.directionCourante = REPOS;

    this.socle.setPosition(this.ancreRepos.x, this.ancreRepos.y);
    this.socle.setStrokeStyle(1, COULEUR, OPACITE_REPOS);
    this.bouton
      .setPosition(this.ancreRepos.x, this.ancreRepos.y)
      .setFillStyle(COULEUR, OPACITE_REPOS);
  }

  private dansZoneActive(pointer: Phaser.Input.Pointer): boolean {
    const { x, y, width, height } = this.zoneActive;
    return (
      pointer.x >= x && pointer.x <= x + width && pointer.y >= y && pointer.y <= y + height
    );
  }
}
