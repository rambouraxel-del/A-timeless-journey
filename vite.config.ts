import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Sur GitHub Pages le jeu est servi depuis /A-timeless-journey/ et non depuis la racine : c'est le nom du depot
// (le jeu s'appelle Chronica, le depot garde son ancien nom). Si le depot est renomme, changer cette valeur en
// meme temps (l'URL Pages devient /<nouveau-nom>/).
const REPO_BASE = '/A-timeless-journey/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? REPO_BASE : '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true, // accessible depuis un telephone sur le meme reseau
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'bundle', // separe le code compile du dossier assets/ des graphismes
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000, // Phaser seul pese ~1,5 Mo
  },
}));
