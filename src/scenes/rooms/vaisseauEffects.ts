import Phaser from 'phaser';
import { DEPTH } from '@/world/Layers';
import { effects, propScale, sx, sy } from '@/data/rooms/vaisseau';

// Ambiance legere de la salle du vaisseau. Tout est cree par le moteur (halos additifs,
// particules) : les images du pack restent statiques et le reacteur ne tourne pas.
// Coordonnees en pixels de texture (salle 2880 x 1080), converties comme le reste du decor.

const CYAN = 0x38d8ff;
const WARM = 0xffd9a0;
const RED = 0xff4a55;

type LightKind = 'pulse' | 'blink';
interface Light {
  x: number;
  y: number;
  w: number; // taille du halo, en pixels de texture
  h: number;
  color: number;
  kind: LightKind;
  period: number; // ms
  low: number; // opacite mini
  high: number; // opacite maxi
  phase?: number; // 0..1 : decale les lumieres entre elles
  // Ecran d'un equipement (id du decor) : eteint tant que le vaisseau n'est pas « reveille » (arrivee du heros).
  screen?: ScreenId;
}

// Voyants et lumieres reperes sur les images du pack (positions mesurees sur scene_complete.png).
const LIGHTS: Light[] = [
  // Plafond : bandeaux cyan (pulsation lente) et blancs chauds (quasi fixes).
  ...[357, 1073, 1796, 2517].map((x, i): Light => ({ x, y: 55, w: 190, h: 34, color: CYAN, kind: 'pulse', period: 3600, low: 0.25, high: 0.6, phase: i / 4 })),
  ...[583, 796, 1303, 1519, 2030, 2246].map((x, i): Light => ({ x, y: 55, w: 120, h: 26, color: WARM, kind: 'pulse', period: 5200, low: 0.3, high: 0.5, phase: i / 6 })),

  // Base du reacteur : barre cyan et deux feux chauds.
  { x: 1760, y: 973, w: 150, h: 34, color: CYAN, kind: 'pulse', period: 2600, low: 0.35, high: 0.85 },
  { x: 1556, y: 962, w: 60, h: 60, color: WARM, kind: 'pulse', period: 3200, low: 0.3, high: 0.75, phase: 0.2 },
  { x: 1964, y: 962, w: 60, h: 60, color: WARM, kind: 'pulse', period: 3200, low: 0.3, high: 0.75, phase: 0.7 },

  // Console : ecrans, boutons rouges, barres chaudes.
  { x: 2104, y: 814, w: 90, h: 90, color: CYAN, kind: 'pulse', period: 2200, low: 0.3, high: 0.8, screen: 'console' },
  { x: 2315, y: 806, w: 120, h: 120, color: CYAN, kind: 'pulse', period: 4200, low: 0.15, high: 0.5, phase: 0.3, screen: 'console' },
  { x: 2199, y: 855, w: 30, h: 30, color: RED, kind: 'blink', period: 1700, low: 0.1, high: 0.9 },
  { x: 2489, y: 854, w: 30, h: 30, color: RED, kind: 'blink', period: 2300, low: 0.1, high: 0.9, phase: 0.5 },
  { x: 2122, y: 893, w: 62, h: 20, color: WARM, kind: 'pulse', period: 3800, low: 0.3, high: 0.6 },
  { x: 2575, y: 893, w: 62, h: 20, color: WARM, kind: 'pulse', period: 3800, low: 0.3, high: 0.6, phase: 0.5 },

  // Ecran mural et voyant chaud a cote.
  { x: 640, y: 570, w: 90, h: 190, color: CYAN, kind: 'pulse', period: 3000, low: 0.15, high: 0.45, phase: 0.4, screen: 'ecran_mural' },
  { x: 717, y: 662, w: 30, h: 110, color: WARM, kind: 'pulse', period: 4400, low: 0.25, high: 0.55, phase: 0.1 },
];

export function makeGlowTexture(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, size, size)!;
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

export function makeMoteTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 8, 8)!;
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 8);
  texture.refresh();
}

// Halos des ecrans, regroupes par equipement (console, ecran mural) pour pouvoir les eteindre et les rallumer.
export type ScreenId = 'console' | 'ecran_mural';
export interface VaisseauEffects {
  screens: Record<ScreenId, Phaser.GameObjects.Container>;
}

export function addVaisseauEffects(scene: Phaser.Scene): VaisseauEffects {
  makeGlowTexture(scene, 'fx-glow', 128);
  makeMoteTexture(scene, 'fx-mote');
  const depth = DEPTH.interactables + 1; // juste au-dessus des equipements, sous le heros
  const screens = {
    console: scene.add.container(0, 0).setDepth(depth),
    ecran_mural: scene.add.container(0, 0).setDepth(depth),
  };

  // --- Voyants et lumieres -----------------------------------------------------
  for (const light of LIGHTS) {
    const glow = scene.add
      .image(light.x * sx, light.y * sy, 'fx-glow')
      .setDisplaySize(light.w * propScale, light.h * propScale)
      .setTint(light.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .setAlpha(light.low);
    if (light.screen) screens[light.screen].add(glow);
    const period = light.period;
    const phase = light.phase ?? 0;
    if (light.kind === 'pulse') {
      scene.tweens.add({ targets: glow, alpha: light.high, duration: period / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: phase * period });
    } else {
      // Clignotement franc : allume un court instant, eteint le reste du temps.
      scene.tweens.add({
        targets: glow,
        alpha: { from: light.low, to: light.high },
        duration: 120,
        hold: period * 0.22,
        yoyo: true,
        repeat: -1,
        repeatDelay: period * 0.6,
        delay: phase * period,
      });
    }
  }

  // --- Reacteur : halo cyan pulse + petites particules ---------------------------
  const pulse = effects.find((e) => e.id === 'reactor-pulse');
  if (pulse?.anchor) {
    const [ax, ay] = pulse.anchor;
    const radius = (pulse.radius ?? 115) * propScale;
    const halo = scene.add
      .image(ax * sx, ay * sy, 'fx-glow')
      .setDisplaySize(radius * 4.2, radius * 4.2)
      .setTint(CYAN)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .setAlpha(0.14);
    const core = scene.add
      .image(ax * sx, ay * sy, 'fx-glow')
      .setDisplaySize(radius * 2.2, radius * 2.2)
      .setTint(0x9beaff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .setAlpha(0.22);
    // Pulsation lente, deux rythmes legerement decales.
    scene.tweens.add({ targets: halo, alpha: 0.3, scale: halo.scale * 1.06, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: core, alpha: 0.42, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });
  }

  const motes = effects.find((e) => e.id === 'reactor-motes');
  if (motes?.bounds && motes.maxParticles) {
    const [x0, y0, x1, y1] = motes.bounds;
    const zone = new Phaser.Geom.Rectangle(x0 * sx, y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy);
    scene.add
      .particles(0, 0, 'fx-mote', {
        emitZone: { type: 'random', source: zone } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
        lifespan: { min: 2600, max: 4200 },
        speedY: { min: -18, max: -6 },
        speedX: { min: -5, max: 5 },
        scale: { start: 0.55 * propScale + 0.15, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        tint: [CYAN, 0x9beaff],
        frequency: 260,
        quantity: 1,
        maxAliveParticles: motes.maxParticles,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(depth + 1);
  }
  return { screens };
}
