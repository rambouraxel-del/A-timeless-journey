import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Sur GitHub Pages le jeu est servi depuis https://<user>.github.io/A-timeless-journey/
// et non depuis la racine du domaine : sans ce prefixe, la page est blanche et
// aucun asset n'est trouve. En developpement local on reste a la racine.
const REPO_BASE = '/A-timeless-journey/';

export default defineConfig(({ command, isPreview }) => ({
  // Le sous-dossier s'applique a la compilation et a sa previsualisation, pour
  // que `npm run preview` reproduise fidelement GitHub Pages. Seul le serveur
  // de developpement reste a la racine.
  base: command === 'build' || isPreview ? REPO_BASE : '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    host: true, // expose le serveur sur le reseau local : permet de tester depuis le telephone
    port: 5173,
  },

  build: {
    outDir: 'dist',
    // Les fichiers compiles vont dans bundle/ et non dans assets/, qui est
    // deja le dossier des graphismes du jeu : melanger les deux rendrait le
    // resultat de la compilation illisible.
    assetsDir: 'bundle',
    assetsInlineLimit: 0, // les PNG de pixel art restent des fichiers, jamais inlines en base64
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
}));
