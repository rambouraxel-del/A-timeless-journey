// Sauvegarde locale (localStorage) : progression du joueur et reglages.
// Toutes les lectures/ecritures sont protegees : navigation privee ou stockage bloque = pas de sauvegarde.

const SAVE_KEY = 'a-timeless-journey:save';
const SETTINGS_KEY = 'a-timeless-journey:settings';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  room: string;
  // Position horizontale dans la salle, de 0 a 1 (independante de la taille de l'ecran).
  x: number;
  facing: -1 | 1;
  health: number;
  stamina: number;
  savedAt: number;
}

export interface Settings {
  // Effets d'ambiance (halo du reacteur, particules, voyants).
  ambient: boolean;
}

const DEFAULT_SETTINGS: Settings = { ambient: true };

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function loadGame(): SaveData | null {
  const data = read(SAVE_KEY) as Partial<SaveData> | null;
  if (!data || data.version !== SAVE_VERSION || typeof data.room !== 'string') return null;
  if (!isNumber(data.x) || !isNumber(data.health) || !isNumber(data.stamina) || (data.facing !== -1 && data.facing !== 1)) return null;
  return { ...(data as SaveData), x: Math.min(1, Math.max(0, data.x)) };
}

export const hasSave = (): boolean => loadGame() !== null;

export function saveGame(data: Omit<SaveData, 'version' | 'savedAt'>): void {
  write(SAVE_KEY, { ...data, version: SAVE_VERSION, savedAt: Date.now() });
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // rien a faire
  }
}

export function getSettings(): Settings {
  const data = read(SETTINGS_KEY) as Partial<Settings> | null;
  return { ambient: typeof data?.ambient === 'boolean' ? data.ambient : DEFAULT_SETTINGS.ambient };
}

export function setSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}
