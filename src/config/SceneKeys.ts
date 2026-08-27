/**
 * Identifiants des scenes Phaser.
 *
 * Regrouper ces chaines evite les fautes de frappe silencieuses : demarrer une
 * scene inexistante ne provoque aucune erreur dans Phaser, l'ecran reste
 * simplement noir.
 */
export const SCENE = {
  BOOT: 'boot',
  PRELOAD: 'preload',
  DIAGNOSTIC: 'diagnostic',
} as const;

export type SceneKey = (typeof SCENE)[keyof typeof SCENE];
