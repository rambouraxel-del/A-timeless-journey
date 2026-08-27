/**
 * Declaration des animations du jeu.
 *
 * Les animations sont enregistrees une seule fois, au chargement, dans le
 * gestionnaire global de Phaser : toutes les scenes y ont ensuite acces sans
 * avoir a les recreer.
 */

import Phaser from 'phaser';

import { SPRITESHEETS } from '@/config/Assets';

/**
 * Les quatre orientations du personnage, dans l'ordre des lignes de la planche.
 *
 * Cet ordre doit rester accorde a la liste RANGEES de tools/decouper-planche.py,
 * qui produit la planche.
 */
export const DIRECTIONS = ['bas', 'gauche', 'droite', 'haut'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Nombre d'images par direction dans la planche du personnage. */
const FRAMES_PAR_DIRECTION = 4;

/** Vitesse du cycle de marche, en images par seconde. */
const CADENCE_MARCHE = 8;

/**
 * Image de repos, au sein d'une direction.
 *
 * C'est celle ou les pieds sont le plus rapproches : le personnage a l'arret
 * garde ainsi une posture naturelle, et non une jambe en l'air.
 */
const IMAGE_REPOS = 0;

/** Cle de l'animation de marche pour une direction donnee. */
export function cleMarche(direction: Direction): string {
  return `heros_marche_${direction}`;
}

/** Cle de l'animation d'attente pour une direction donnee. */
export function cleRepos(direction: Direction): string {
  return `heros_repos_${direction}`;
}

/** Enregistre toutes les animations du personnage. */
export function registerAnimations(anims: Phaser.Animations.AnimationManager): void {
  DIRECTIONS.forEach((direction, ligne) => {
    const premiereImage = ligne * FRAMES_PAR_DIRECTION;

    anims.create({
      key: cleMarche(direction),
      frames: anims.generateFrameNumbers(SPRITESHEETS.heros.key, {
        start: premiereImage,
        end: premiereImage + FRAMES_PAR_DIRECTION - 1,
      }),
      frameRate: CADENCE_MARCHE,
      repeat: -1,
    });

    anims.create({
      key: cleRepos(direction),
      frames: [{ key: SPRITESHEETS.heros.key, frame: premiereImage + IMAGE_REPOS }],
      frameRate: 1,
    });
  });
}
