/**
 * Scene de diagnostic.
 *
 * Scene temporaire de developpement, destinee a disparaitre une fois le jeu en
 * place. Elle verifie d'un coup d'oeil, et directement sur le telephone, que :
 *   - la resolution portrait s'adapte bien a l'ecran reel ;
 *   - le pixel art reste net a l'agrandissement ;
 *   - chaque tuile de la planche s'affiche correctement ;
 *   - les zones reservees a l'interface tombent au bon endroit ;
 *   - les animations du personnage tournent.
 */

import Phaser from 'phaser';

import { TILESETS, TUILE, type TuileId } from '@/config/Assets';
import {
  ACTION_BUTTON_RADIUS,
  JOYSTICK_RADIUS,
  type LayoutZones,
  type Zone,
  computeLayout,
} from '@/config/Layout';
import { GAME_WIDTH, TILE_SIZE, VIEWPORT_TILES_X } from '@/config/Resolution';
import { SCENE } from '@/config/SceneKeys';
import { cleMarche } from '@/systems/Animations';

const COULEUR_ACCENT = 0x6bd6c4;
const COULEUR_ALERTE = 0xe0806a;
const COULEUR_TEXTE = '#e8e6f0';

export class DiagnosticScene extends Phaser.Scene {
  private layout!: LayoutZones;

  constructor() {
    super(SCENE.DIAGNOSTIC);
  }

  create(): void {
    const hauteurJeu = this.scale.height;
    this.layout = computeLayout(hauteurJeu);

    this.dessinerTerrain(hauteurJeu);
    this.dessinerZonesInterface();
    this.dessinerCommandes();
    this.ajouterPersonnage();
    this.afficherInformations(hauteurJeu);
  }

  /**
   * Peint un decor de demonstration ou chaque tuile de la planche apparait au
   * moins une fois.
   *
   * Le decor est aplati dans une seule texture : le moteur n'a alors qu'une
   * image a dessiner au lieu d'un millier de petites tuiles independantes.
   */
  private dessinerTerrain(hauteurJeu: number): void {
    const tuilesEnHauteur = Math.ceil(hauteurJeu / TILE_SIZE);
    const texture = this.add.renderTexture(0, 0, GAME_WIDTH, hauteurJeu).setOrigin(0, 0);

    const tampon = this.make.image(
      { key: TILESETS.terrain.key, frame: 0, add: false },
      false,
    );
    tampon.setOrigin(0, 0);

    for (let ty = 0; ty < tuilesEnHauteur; ty += 1) {
      for (let tx = 0; tx < VIEWPORT_TILES_X; tx += 1) {
        tampon.setFrame(this.tuileDeDemonstration(tx, ty, tuilesEnHauteur));
        texture.draw(tampon, tx * TILE_SIZE, ty * TILE_SIZE);
      }
    }

    tampon.destroy();
    texture.setDepth(0);
  }

  /** Choisit la tuile a peindre a une position donnee du decor de demonstration. */
  private tuileDeDemonstration(tx: number, ty: number, tuilesEnHauteur: number): TuileId {
    // Bande de vaisseau tout en haut : verifie les tuiles metalliques.
    if (ty < 3) return ty === 2 ? TUILE.MUR_VAISSEAU : TUILE.SOL_VAISSEAU;

    // Riviere en bas : verifie la tuile d'eau.
    if (ty >= tuilesEnHauteur - 3) return TUILE.EAU;

    // Plage juste au dessus de la riviere.
    if (ty >= tuilesEnHauteur - 5) return TUILE.SABLE;

    // Chemin vertical central.
    if (tx === 9 || tx === 10) return TUILE.CHEMIN;

    // Quelques obstacles disperses, places par une regle fixe plutot qu'au
    // hasard : le decor reste ainsi identique d'un lancement a l'autre.
    if ((tx * 7 + ty * 3) % 23 === 0) return TUILE.ARBRE;
    if ((tx * 5 + ty * 11) % 29 === 0) return TUILE.ROCHER;

    return TUILE.HERBE;
  }

  /** Materialise les bandes reservees a l'interface. */
  private dessinerZonesInterface(): void {
    const calque = this.add.graphics().setDepth(10);

    this.remplirZone(calque, this.layout.hud, COULEUR_ACCENT, 0.18);
    this.remplirZone(calque, this.layout.controls, COULEUR_ALERTE, 0.18);

    // Contour de la zone garantie libre d'interface.
    calque.lineStyle(1, COULEUR_ACCENT, 0.8);
    const jeu = this.layout.safePlayArea;
    calque.strokeRect(jeu.x + 0.5, jeu.y + 0.5, jeu.width - 1, jeu.height - 1);

    this.etiquette('BARRE D ETAT', 4, this.layout.hud.y + 2, 10);
    this.etiquette('COMMANDES TACTILES', 4, this.layout.controls.y + 2, 10);
  }

  private remplirZone(
    calque: Phaser.GameObjects.Graphics,
    zone: Zone,
    couleur: number,
    opacite: number,
  ): void {
    calque.fillStyle(couleur, opacite);
    calque.fillRect(zone.x, zone.y, zone.width, zone.height);
    calque.lineStyle(1, couleur, 0.9);
    calque.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.width - 1, zone.height - 1);
  }

  /** Dessine l'emprise du joystick et du bouton d'action. */
  private dessinerCommandes(): void {
    const calque = this.add.graphics().setDepth(11);
    const { joystickAnchor, actionButtonAnchor } = this.layout;

    calque.lineStyle(1, COULEUR_ACCENT, 0.9);
    calque.strokeCircle(joystickAnchor.x, joystickAnchor.y, JOYSTICK_RADIUS);
    calque.fillStyle(COULEUR_ACCENT, 0.15);
    calque.fillCircle(joystickAnchor.x, joystickAnchor.y, JOYSTICK_RADIUS);
    calque.fillStyle(COULEUR_ACCENT, 0.5);
    calque.fillCircle(joystickAnchor.x, joystickAnchor.y, JOYSTICK_RADIUS / 2.5);

    calque.lineStyle(1, COULEUR_ACCENT, 0.9);
    calque.strokeCircle(actionButtonAnchor.x, actionButtonAnchor.y, ACTION_BUTTON_RADIUS);
    calque.fillStyle(COULEUR_ACCENT, 0.15);
    calque.fillCircle(actionButtonAnchor.x, actionButtonAnchor.y, ACTION_BUTTON_RADIUS);
  }

  /** Place un personnage anime au centre de la zone de jeu. */
  private ajouterPersonnage(): void {
    const jeu = this.layout.safePlayArea;
    const heros = this.add
      .sprite(GAME_WIDTH / 2, jeu.y + jeu.height / 2, 'sprite_heros')
      .setDepth(5);

    heros.play(cleMarche('bas'));

    // Fait defiler les quatre orientations, pour verifier chaque ligne de la planche.
    const orientations = ['bas', 'gauche', 'haut', 'droite'] as const;
    let index = 0;
    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        index = (index + 1) % orientations.length;
        heros.play(cleMarche(orientations[index]!));
      },
    });
  }

  /** Affiche les mesures utiles pour valider l'affichage sur un appareil reel. */
  private afficherInformations(hauteurJeu: number): void {
    const jeu = this.layout.safePlayArea;
    const ratioEcran = (window.innerHeight / window.innerWidth).toFixed(2);
    const echelle = (this.scale.displaySize.width / GAME_WIDTH).toFixed(2);

    const lignes = [
      'A TIMELESS JOURNEY  v0.1',
      '',
      `Resolution jeu : ${GAME_WIDTH} x ${hauteurJeu}`,
      `Tuiles visibles : ${VIEWPORT_TILES_X} x ${Math.floor(hauteurJeu / TILE_SIZE)}`,
      `Ecran : ${window.innerWidth} x ${window.innerHeight}  (${ratioEcran}:1)`,
      `Agrandissement : x${echelle}`,
      `Densite de pixels : ${window.devicePixelRatio}`,
    ];

    const texte = this.add
      .text(6, jeu.y + 8, lignes.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: COULEUR_TEXTE,
        lineSpacing: 3,
      })
      // Le texte est rasterise a plus haute definition que le jeu, sinon il
      // devient illisible une fois la scene agrandie sur l'ecran du telephone.
      .setResolution(4)
      .setDepth(12);

    // Panneau sombre derriere le texte : sans lui, les lettres se perdent dans
    // le decor des qu'un arbre passe dessous.
    this.add
      .rectangle(
        texte.x - 4,
        texte.y - 4,
        texte.width + 8,
        texte.height + 8,
        0x0b0d17,
        0.75,
      )
      .setOrigin(0, 0)
      .setDepth(11);
  }

  private etiquette(texte: string, x: number, y: number, profondeur: number): void {
    this.add
      .text(x, y, texte, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: COULEUR_TEXTE,
      })
      .setResolution(4)
      .setDepth(profondeur + 1);
  }
}
