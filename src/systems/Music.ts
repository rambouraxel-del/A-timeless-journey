import { MusicTracks, type MusicTrack, type SoundEffect, SoundEffects } from '@/config/Audio';

const FADE_SECONDS = 1.6;

interface Channel {
  audio: HTMLAudioElement;
  target: number; // volume visé (0 = on s'éteint)
  level: number; // volume courant, 0 à 1 (avant volume de la piste)
  failed: boolean;
  blocked: boolean; // lecture refusee par le navigateur : on reessaie au premier toucher
}

// Ambiance musicale : une piste a la fois, enchainee en fondu. La lecture est tentee tout de suite ; si le
// navigateur la bloque (avant le premier toucher), elle demarre au premier toucher. Fichier absent : piste ignoree.
class MusicPlayer {
  private channels = new Map<MusicTrack, Channel>();
  private wanted: MusicTrack | null = null;
  private unlocked = false;

  // Piste demandee (null : silence).
  get current(): MusicTrack | null {
    return this.wanted;
  }

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  play(track: MusicTrack | null): void {
    this.wanted = track;
  }

  // A appeler a chaque image (dt en secondes).
  update(dt: number): void {
    for (const name of Object.keys(MusicTracks) as MusicTrack[]) {
      const wantedHere = this.wanted === name;
      let ch = this.channels.get(name);
      if (!ch) {
        if (!wantedHere) continue;
        ch = this.open(name);
        this.channels.set(name, ch);
      }
      if (ch.failed || (ch.blocked && !this.unlocked)) continue;
      ch.target = wantedHere ? 1 : 0;
      const step = dt / FADE_SECONDS;
      ch.level = ch.target > ch.level ? Math.min(ch.target, ch.level + step) : Math.max(ch.target, ch.level - step);
      ch.audio.volume = ch.level * MusicTracks[name].volume;
      if (ch.level === 0 && !ch.audio.paused) ch.audio.pause();
      else if (ch.level > 0 && ch.audio.paused && wantedHere) {
        ch.blocked = false;
        void ch.audio.play().catch(() => (ch!.blocked = true));
      }
    }
  }

  private open(name: MusicTrack): Channel {
    const audio = new Audio(MusicTracks[name].url);
    audio.loop = true;
    audio.volume = 0;
    const ch: Channel = { audio, target: 0, level: 0, failed: false, blocked: false };
    audio.addEventListener('error', () => (ch.failed = true));
    return ch;
  }
}

export const Music = new MusicPlayer();

// Bruitage ponctuel ; ignore si le fichier est absent ou si la lecture est bloquee.
export function playSound(name: SoundEffect): void {
  try {
    const audio = new Audio(SoundEffects[name].url);
    audio.volume = SoundEffects[name].volume;
    audio.addEventListener('error', () => undefined);
    void audio.play().catch(() => undefined);
  } catch {
    // pas de son
  }
}
