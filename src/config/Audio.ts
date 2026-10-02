// Pistes d'ambiance (chemins relatifs a public/). Aucun fichier audio n'est encore fourni :
// deposer les fichiers ci-dessous pour activer la musique, sans autre modification.
export const MusicTracks = {
  galerie: { url: 'assets/audio/musee-galerie.mp3', volume: 0.5 },
  sacre: { url: 'assets/audio/musee-sacre.mp3', volume: 0.55 },
} as const;

export type MusicTrack = keyof typeof MusicTracks;
