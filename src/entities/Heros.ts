/**
 * Le personnage joue.
 *
 * Regroupe le corps physique, l'orientation et le choix de l'animation, pour
 * que les scenes n'aient qu'a lui transmettre une direction.
 */

import Phaser from 'phaser';

import { COLLISION_HEROS, SPRITESHEETS } from '@/config/Assets';
import { type Direction, cleMarche, cleRepos } from '@/systems/Animations';
import type { DirectionJoystick } from '@/ui/JoystickVirtuel';

/** Vitesse de deplacement, en pixels de jeu par seconde. */
const VITESSE = 70;

export class Heros extends Phaser.Physics.Arcade.Sprite {
  private orientation: Direction = 'bas';
  private enMarche = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, SPRITESHEETS.heros.key, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Le point d'ancrage est le milieu du bord inferieur, la ou les pieds
    // touchent le sol : positionner le personnage revient donc a dire ou il se
    // tient, sans avoir a compenser la hauteur de son image.
    this.setOrigin(0.5, 1);

    const corps = this.body as Phaser.Physics.Arcade.Body;
    corps.setSize(COLLISION_HEROS.largeur, COLLISION_HEROS.hauteur);
    corps.setOffset(COLLISION_HEROS.decalageX, COLLISION_HEROS.decalageY);
    corps.setCollideWorldBounds(true);

    this.play(cleRepos(this.orientation));
  }

  /** Direction vers laquelle le personnage regarde. */
  get regard(): Direction {
    return this.orientation;
  }

  /**
   * Applique la direction demandee par le joueur.
   *
   * @param direction Vecteur normalise issu du joystick.
   */
  deplacer(direction: DirectionJoystick): void {
    const corps = this.body as Phaser.Physics.Arcade.Body;

    if (direction.intensite === 0) {
      corps.setVelocity(0, 0);
      this.mettreAJourAnimation(false);
      return;
    }

    const vitesse = VITESSE * direction.intensite;
    corps.setVelocity(direction.x * vitesse, direction.y * vitesse);

    this.orientation = orientationDepuisVecteur(direction, this.orientation);
    this.mettreAJourAnimation(true);
  }

  private mettreAJourAnimation(marche: boolean): void {
    const cle = marche ? cleMarche(this.orientation) : cleRepos(this.orientation);

    // On ne relance l'animation que si elle change reellement : la rejouer a
    // chaque image la figerait sur sa premiere pose.
    if (this.anims.currentAnim?.key !== cle) {
      this.play(cle);
    }
    this.enMarche = marche;
  }

  /** Indique si le personnage est en train de marcher. */
  get marche(): boolean {
    return this.enMarche;
  }
}

/**
 * Choisit l'orientation a afficher pour un vecteur de deplacement.
 *
 * En diagonale, l'axe dominant l'emporte. A egalite parfaite, l'orientation
 * precedente est conservee : sans cela, le personnage clignoterait entre deux
 * poses en marchant exactement a 45 degres.
 */
function orientationDepuisVecteur(
  direction: DirectionJoystick,
  precedente: Direction,
): Direction {
  const horizontal = Math.abs(direction.x);
  const vertical = Math.abs(direction.y);

  if (horizontal === vertical) return precedente;
  if (horizontal > vertical) return direction.x > 0 ? 'droite' : 'gauche';
  return direction.y > 0 ? 'bas' : 'haut';
}
