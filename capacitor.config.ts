import type { CapacitorConfig } from '@capacitor/cli';

// Prototype mobile : le jeu compile (dist/, `npm run build:mobile`) est embarque dans l'application.
// L'identifiant est provisoire : a fixer avant toute publication (il ne peut plus changer ensuite).
const config: CapacitorConfig = {
  appId: 'com.atimelessjourney.game',
  appName: 'A Timeless Journey',
  webDir: 'dist',
  backgroundColor: '#101014',
};

export default config;
