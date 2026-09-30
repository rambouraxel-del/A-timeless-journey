// Fichier genere par tools/decouper-ui.py : ne pas modifier a la main.
// Taille d'affichage (en pixels logiques, echelle 1) de chaque element d'interface.
export const UiSizes = {
  hud_emblem: { w: 56, h: 56.58 },
  hud_hearts_frame: { w: 86, h: 22.5 },
  hud_heart_full: { w: 12, h: 11.18 },
  hud_heart_empty: { w: 12, h: 11.07 },
  hud_energy_frame: { w: 86, h: 23.65 },
  hud_energy_fill: { w: 2, h: 4.83 },
  btn_menu: { w: 34, h: 33.18 },
  joystick_base: { w: 128, h: 126.14 },
  joystick_thumb: { w: 44, h: 43.48 },
  btn_interact: { w: 96, h: 95.27 },
  btn_interact_pressed: { w: 96, h: 95.27 },
  btn_run: { w: 66, h: 66.93 },
  btn_run_pressed: { w: 66, h: 66.93 },
  dialogue_frame: { w: 82.86, h: 81.65 },
  dialogue_motif: { w: 71.2, h: 57.59 },
  dialogue_portrait: { w: 64, h: 58.18 },
  dialogue_nameplate: { w: 64, h: 19.89 },
  orn_astral: { w: 112, h: 113.2 },
  orn_mountains: { w: 440, h: 44.65 },
  orn_separator: { w: 200, h: 23.74 },
  orn_corner: { w: 18, h: 15.2 },
} as const;

export type UiKey = keyof typeof UiSizes;
