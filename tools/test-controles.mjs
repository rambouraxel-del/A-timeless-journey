/**
 * Test des commandes tactiles, dans un vrai navigateur.
 *
 * Un joystick ne se verifie pas sur une capture d'ecran figee. Ce script pilote
 * la surface tactile du navigateur comme le ferait un pouce, puis lit la
 * position du personnage dans le jeu pour verifier qu'il est bien parti dans la
 * direction demandee, et qu'il s'arrete contre les obstacles.
 *
 * Le serveur de developpement doit tourner (npm run dev) : la position du
 * personnage n'est lisible que dans ce mode.
 *
 * Usage : npm run test:controles
 */

import { chromium } from 'playwright';

const CHROMIUM_SYSTEME = process.env.CHROMIUM_PATH;
const URL_JEU = process.env.GAME_URL ?? 'http://localhost:5173/';

/** Duree de maintien du doigt sur le joystick, en millisecondes. */
const DUREE_POUSSEE = 700;

/** Deplacement minimal attendu sur l'axe pousse, en pixels de jeu. */
const DEPLACEMENT_MINIMAL = 12;

/** Derive maximale toleree sur l'axe oppose, en pixels de jeu. */
const DERIVE_MAXIMALE = 4;

/**
 * Amplitude du glissement du doigt, en pixels d'ecran.
 *
 * Assez large pour depasser le rayon du joystick et donner une poussee maximale,
 * assez courte pour que le doigt reste dans l'ecran depuis son point de depart.
 */
const POUSSEE_ECRAN = 60;

const browser = await chromium.launch(
  CHROMIUM_SYSTEME ? { executablePath: CHROMIUM_SYSTEME } : {},
);
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();
const erreurs = [];
page.on('pageerror', (erreur) => erreurs.push(erreur.message));
page.on('console', (message) => {
  if (message.type() === 'error') erreurs.push(message.text());
});

await page.goto(URL_JEU, { waitUntil: 'networkidle' });

// Attend que la scene de jeu soit reellement demarree, et pas seulement chargee.
await page.waitForFunction(
  () => window.jeu?.scene?.getScene('jeu')?.scene?.isActive(),
  null,
  { timeout: 15000 },
);

const cdp = await context.newCDPSession(page);

/** Position du personnage dans le monde, en pixels de jeu. */
const lirePosition = () =>
  page.evaluate(() => {
    const scene = window.jeu.scene.getScene('jeu');
    return {
      x: scene.heros.x,
      y: scene.heros.y,
      animation: scene.heros.anims.currentAnim?.key ?? null,
    };
  });

/** Convertit une position dans le jeu en position sur l'ecran du navigateur. */
const versEcran = (jeuX, jeuY) =>
  page.evaluate(
    ([gx, gy]) => {
      const canvas = document.querySelector('canvas');
      const cadre = canvas.getBoundingClientRect();
      const echelle = cadre.width / window.jeu.scale.width;
      return { x: cadre.left + gx * echelle, y: cadre.top + gy * echelle };
    },
    [jeuX, jeuY],
  );

const toucher = (type, point) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x: point.x, y: point.y, id: 1 }],
  });

/**
 * Pose le doigt, le fait glisser dans une direction, maintient, puis relache.
 *
 * @param dx Deplacement horizontal du doigt, en pixels d'ecran.
 * @param dy Deplacement vertical du doigt, en pixels d'ecran.
 */
async function pousser(dx, dy, duree = DUREE_POUSSEE) {
  const taille = await page.evaluate(() => ({
    largeur: window.jeu.scale.width,
    hauteur: window.jeu.scale.height,
  }));
  const depart = await versEcran(taille.largeur * 0.25, taille.hauteur * 0.8);

  await toucher('touchStart', depart);
  await page.waitForTimeout(40);
  await toucher('touchMove', { x: depart.x + dx, y: depart.y + dy });

  // L'animation se lit pendant la poussee : une fois le doigt releve, le
  // personnage est deja revenu a sa pose de repos.
  await page.waitForTimeout(duree / 2);
  const animation = await page.evaluate(() => {
    const scene = window.jeu.scene.getScene('jeu');
    return scene.heros.anims.currentAnim?.key ?? null;
  });
  await page.waitForTimeout(duree / 2);

  await toucher('touchEnd', depart);
  await page.waitForTimeout(120);
  return animation;
}

const essais = [
  { nom: 'droite', dx: POUSSEE_ECRAN, dy: 0, axe: 'x', sens: 1, animation: 'heros_marche_droite' },
  { nom: 'gauche', dx: -POUSSEE_ECRAN, dy: 0, axe: 'x', sens: -1, animation: 'heros_marche_gauche' },
  { nom: 'bas', dx: 0, dy: POUSSEE_ECRAN, axe: 'y', sens: 1, animation: 'heros_marche_bas' },
  { nom: 'haut', dx: 0, dy: -POUSSEE_ECRAN, axe: 'y', sens: -1, animation: 'heros_marche_haut' },
];

let echecs = 0;
console.log('Test des commandes tactiles\n');

for (const essai of essais) {
  const avant = await lirePosition();
  const pendant = await pousser(essai.dx, essai.dy);
  const apres = await lirePosition();

  const autre = essai.axe === 'x' ? 'y' : 'x';
  const avance = (apres[essai.axe] - avant[essai.axe]) * essai.sens;
  const derive = Math.abs(apres[autre] - avant[autre]);

  const deplacementOk = avance >= DEPLACEMENT_MINIMAL;
  const deriveOk = derive <= DERIVE_MAXIMALE;
  const animationOk = pendant === essai.animation;
  const ok = deplacementOk && deriveOk && animationOk;
  if (!ok) echecs += 1;

  console.log(
    `  ${ok ? 'OK  ' : 'ECHEC'} ${essai.nom.padEnd(7)} ` +
      `avance ${avance.toFixed(1).padStart(6)} px  ` +
      `derive ${derive.toFixed(1).padStart(5)} px  ` +
      `animation ${pendant}`,
  );

  if (!deplacementOk) console.log(`         avance attendue >= ${DEPLACEMENT_MINIMAL} px`);
  if (!deriveOk) console.log(`         derive attendue <= ${DERIVE_MAXIMALE} px`);
  if (!animationOk) console.log(`         animation attendue ${essai.animation}`);
}

// Le personnage doit finir par buter contre la ceinture de rochers plutot que
// de sortir de la carte.
//
// Le doigt reste volontairement dans l'ecran : un deplacement qui sort du cadre
// n'est pas transmis a la page, le joystick ne bouge pas, et le test conclurait
// a un arret alors que le personnage n'a simplement jamais demarre.
console.log('\nCollision contre le bord de la carte');
const avantMur = await lirePosition();
await pousser(-POUSSEE_ECRAN, 0, 5000);
const contreBord = await lirePosition();
await pousser(-POUSSEE_ECRAN, 0, 1500);
const encoreContreBord = await lirePosition();

const aAvance = avantMur.x - contreBord.x > 100;
const bloque = Math.abs(encoreContreBord.x - contreBord.x) < 2;
if (!aAvance || !bloque) echecs += 1;
console.log(
  `  ${aAvance && bloque ? 'OK  ' : 'ECHEC'} parti de x=${avantMur.x.toFixed(1)}, ` +
    `arret a x=${contreBord.x.toFixed(1)} puis x=${encoreContreBord.x.toFixed(1)}`,
);
if (!aAvance) console.log('         le personnage n a pas atteint le bord');
if (!bloque) console.log('         le personnage a franchi le bord');

if (erreurs.length > 0) {
  echecs += 1;
  console.log(`\n${erreurs.length} erreur(s) de console :`);
  for (const erreur of erreurs) console.log(`  ${erreur}`);
}

await browser.close();

console.log(echecs === 0 ? '\nTous les tests passent.' : `\n${echecs} test(s) en echec.`);
process.exitCode = echecs === 0 ? 0 : 1;
