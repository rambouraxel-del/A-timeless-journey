import { UiFont } from '@/config/Assets';

// Palette issue de la maquette : bleu nuit, or/cuivre, bleu lumineux.
export const UiColors = {
  panel: 0x10121c,
  gold: '#f2c46b',
  text: '#efe6d2',
  energy: '#46c8ff',
} as const;

export function textStyle(size: number, color: string = UiColors.text): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: UiFont.family, fontSize: `${size}px`, color };
}
