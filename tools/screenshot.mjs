/**
 * Capture d'ecran du jeu dans un navigateur, aux dimensions d'un telephone.
 *
 * Sert a verifier le rendu sans avoir a sortir son telephone : mise en page
 * portrait, nettete du pixel art, erreurs de console. Le serveur de
 * developpement doit tourner (npm run dev).
 *
 * Usage : npm run shot [-- <largeur> <hauteur> <fichier-sortie>]
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { chromium } from 'playwright';

/**
 * Chemin d'un Chromium deja present sur la machine.
 *
 * Laisse vide, Playwright utilise le navigateur qu'il a lui-meme installe.
 * La variable ne sert qu'aux environnements ou un Chromium est deja fourni.
 */
const CHROMIUM_SYSTEME = process.env.CHROMIUM_PATH;

const [largeurArg, hauteurArg, sortieArg] = process.argv.slice(2);

const url = process.env.GAME_URL ?? 'http://localhost:5173/';
const largeur = Number(largeurArg ?? 393); // iPhone 15 / Pixel 8 en points CSS
const hauteur = Number(hauteurArg ?? 852);
const sortie = resolve(sortieArg ?? `captures/portrait-${largeur}x${hauteur}.png`);

mkdirSync(dirname(sortie), { recursive: true });

const browser = await chromium.launch(
  CHROMIUM_SYSTEME ? { executablePath: CHROMIUM_SYSTEME } : {},
);
const context = await browser.newContext({
  viewport: { width: largeur, height: hauteur },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();

const erreurs = [];
page.on('console', (message) => {
  if (message.type() === 'error') erreurs.push(message.text());
});
page.on('pageerror', (erreur) => erreurs.push(`Erreur de page : ${erreur.message}`));
page.on('response', (reponse) => {
  if (reponse.status() >= 400) erreurs.push(`${reponse.status()} sur ${reponse.url()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
// Laisse le temps au chargement des assets et a quelques images d'animation.
await page.waitForTimeout(2500);
await page.screenshot({ path: sortie });

await browser.close();

console.log(`Capture : ${sortie}`);
if (erreurs.length > 0) {
  console.error(`\n${erreurs.length} erreur(s) dans la console :`);
  for (const erreur of erreurs) console.error(`  ${erreur}`);
  process.exitCode = 1;
} else {
  console.log('Aucune erreur dans la console.');
}
