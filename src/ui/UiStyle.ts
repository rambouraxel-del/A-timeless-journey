import { UiFont } from '@/config/Assets';
import { RENDER_SCALE } from '@/config/Layout';

// Palette issue de la maquette : bleu nuit, or/cuivre, bleu lumineux.
export const UiColors = {
  panel: 0x10121c,
  gold: '#f2c46b',
  text: '#efe6d2',
  energy: '#46c8ff',
} as const;

// Le texte est dessine a la resolution de l'ecran (resolution) pour rester net.
export function textStyle(size: number, color: string = UiColors.text, extraScale = 1): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: UiFont.family, fontSize: `${size}px`, color, resolution: Math.ceil(RENDER_SCALE * extraScale) };
}
