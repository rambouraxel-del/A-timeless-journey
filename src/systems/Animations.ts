/**
 * Declaration des animations du jeu.
 *
 * Les animations sont enregistrees une seule fois, au chargement, dans le
 * gestionnaire global de Phaser : toutes les scenes y ont ensuite acces sans
 * avoir a les recreer.
 */

import Phaser from 'phaser';

import { SPRITESHEETS } from '@/config/Assets';

/** Les quatre orientations du personnage. */
export const DIRECTIONS = ['bas', 'gauche', 'droite', 'haut'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Nombre d'images par direction dans la planche du personnage. */
const FRAMES_PAR_DIRECTION = 3;

/** Vitesse du cycle de marche, en images par seconde. */
const CADENCE_MARCHE = 8;

/** Cle de l'animation de marche pour une direction donnee. */
export function cleMarche(direction: Direction): string {
  return `heros_marche_${direction}`;
}

/** Cle de l'animation d'attente pour une direction donnee. */
export function cleRepos(direction: Direction): string {
  return `heros_repos_${direction}`;
}

/**
 * Enregistre toutes les animations du personnage.
 *
 * La planche est organisee en une ligne par direction, dans l'ordre de
 * DIRECTIONS, avec trois images par ligne : repos, pas gauche, pas droit.
 */
export function registerAnimations(anims: Phaser.Animations.AnimationManager): void {
  DIRECTIONS.forEach((direction, ligne) => {
    const premiereImage = ligne * FRAMES_PAR_DIRECTION;

    // Le cycle passe par l'image de repos entre chaque pas : c'est ce retour au
    // centre qui donne son rythme a la marche.
    anims.create({
      key: cleMarche(direction),
      frames: [premiereImage, premiereImage + 1, premiereImage, premiereImage + 2].map(
        (frame) => ({ key: SPRITESHEETS.heros.key, frame }),
      ),
      frameRate: CADENCE_MARCHE,
      repeat: -1,
    });

    anims.create({
      key: cleRepos(direction),
      frames: [{ key: SPRITESHEETS.heros.key, frame: premiereImage }],
      frameRate: 1,
    });
  });
}
