// Bruitages synthetises (Web Audio) : le projet ne contient aucun fichier son pour ces evenements.
// Rien n'est joue tant que le navigateur n'a pas autorise l'audio (premier toucher) ; aucune erreur sinon.

let ctx: AudioContext | null = null;
let unlocked = false;

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    void audio()?.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function audio(): AudioContext | null {
  if (!unlocked) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Bruit filtre avec une enveloppe rapide.
function burst(c: AudioContext, opts: { at?: number; duration: number; freq: number; q?: number; gain: number; type?: BiquadFilterType }): void {
  const t = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, opts.duration);
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'lowpass';
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

function tone(c: AudioContext, opts: { at?: number; duration: number; from: number; to?: number; gain: number; type?: OscillatorType }): void {
  const t = c.currentTime + (opts.at ?? 0);
  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.from, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + opts.duration + 0.05);
}

export const Sfx = {
  // Coup de feu lointain (claquement + echo dans la ruelle).
  gunshot(): void {
    const c = audio();
    if (!c) return;
    burst(c, { duration: 0.35, freq: 2600, gain: 0.55 });
    burst(c, { at: 0.02, duration: 0.6, freq: 700, gain: 0.3 });
    burst(c, { at: 0.18, duration: 0.5, freq: 900, gain: 0.08 });
  },
  // Chute sourde.
  thud(): void {
    const c = audio();
    if (!c) return;
    tone(c, { duration: 0.35, from: 110, to: 45, gain: 0.45 });
    burst(c, { duration: 0.25, freq: 300, gain: 0.2 });
  },
  // Cle qui tourne dans la serrure.
  unlock(): void {
    const c = audio();
    if (!c) return;
    burst(c, { duration: 0.06, freq: 3500, q: 4, type: 'bandpass', gain: 0.35 });
    burst(c, { at: 0.16, duration: 0.08, freq: 2200, q: 4, type: 'bandpass', gain: 0.4 });
  },
  // Porte qui se referme doucement.
  doorClose(): void {
    const c = audio();
    if (!c) return;
    burst(c, { duration: 0.5, freq: 400, gain: 0.12 });
    tone(c, { at: 0.35, duration: 0.25, from: 90, to: 60, gain: 0.25 });
  },
  // Consoles qui s'allument : petite montee electronique.
  powerUp(): void {
    const c = audio();
    if (!c) return;
    tone(c, { duration: 0.6, from: 180, to: 720, gain: 0.08, type: 'triangle' });
    tone(c, { at: 0.5, duration: 0.18, from: 880, gain: 0.06, type: 'square' });
    tone(c, { at: 0.7, duration: 0.18, from: 1320, gain: 0.05, type: 'square' });
  },
};

// Bourdonnement continu (attraction de la porte) : intensite 0 a 1, lissee.
export class Hum {
  private osc: OscillatorNode[] = [];
  private gain: GainNode | null = null;

  set(level: number): void {
    const c = audio();
    if (!c) return;
    if (!this.gain) {
      this.gain = c.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(c.destination);
      for (const [f, type] of [[55, 'sine'], [110.5, 'sine'], [166, 'triangle']] as const) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = f;
        const g = c.createGain();
        g.gain.value = f === 55 ? 1 : 0.35;
        o.connect(g).connect(this.gain);
        o.start();
        this.osc.push(o);
      }
    }
    this.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.07, c.currentTime, 0.15);
  }

  stop(): void {
    for (const o of this.osc) {
      try {
        o.stop();
      } catch {
        // deja arrete
      }
    }
    this.gain?.disconnect();
    this.osc = [];
    this.gain = null;
  }
}
