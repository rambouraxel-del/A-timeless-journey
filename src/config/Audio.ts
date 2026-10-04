// Pistes d'ambiance (chemins relatifs a public/). Le theme principal est fourni ; pour les autres,
// deposer les fichiers ci-dessous pour activer la musique, sans autre modification.
export const MusicTracks = {
  // Theme principal (The Chronos Motif) : menu d'accueil.
  theme: { url: 'assets/audio/theme-principal.mp3', volume: 0.6 },
  galerie: { url: 'assets/audio/musee-galerie.mp3', volume: 0.5 },
  sacre: { url: 'assets/audio/musee-sacre.mp3', volume: 0.55 },
} as const;

export type MusicTrack = keyof typeof MusicTracks;

// Bruitages joues une fois. Aucun fichier n'est encore fourni : sans fichier, le jeu reste silencieux.
export const SoundEffects = {
  alarme: { url: 'assets/audio/alarme.mp3', volume: 0.6 },
} as const;

export type SoundEffect = keyof typeof SoundEffects;
