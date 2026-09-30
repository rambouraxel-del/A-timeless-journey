// Sauvegarde locale (localStorage) : progression du joueur et reglages.
// Toutes les lectures/ecritures sont protegees : navigation privee ou stockage bloque = pas de sauvegarde.

const LEGACY_KEY = 'a-timeless-journey:save'; // ancienne sauvegarde unique, migree vers l'emplacement 1
const SLOTS_KEY = 'a-timeless-journey:slots';
const SETTINGS_KEY = 'a-timeless-journey:settings';
const SAVE_VERSION = 2;
export const SLOT_COUNT = 3;

export interface SaveData {
  version: number;
  room: string;
  // Nom du lieu affiche dans la liste des emplacements.
  place: string;
  // Position horizontale dans la salle, de 0 a 1 (independante de la taille de l'ecran).
  x: number;
  facing: -1 | 1;
  health: number;
  stamina: number;
  // Temps de jeu cumule, en secondes.
  playTime: number;
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

function validate(raw: unknown): SaveData | null {
  const data = raw as Partial<SaveData> | null;
  if (!data || typeof data.room !== 'string') return null;
  if (!isNumber(data.x) || !isNumber(data.health) || !isNumber(data.stamina) || (data.facing !== -1 && data.facing !== 1)) return null;
  return {
    version: SAVE_VERSION,
    room: data.room,
    place: typeof data.place === 'string' ? data.place : 'Vaisseau',
    x: Math.min(1, Math.max(0, data.x)),
    facing: data.facing,
    health: data.health,
    stamina: data.stamina,
    playTime: isNumber(data.playTime) ? Math.max(0, data.playTime) : 0,
    savedAt: isNumber(data.savedAt) ? data.savedAt : 0,
  };
}

function writeSlots(slots: (SaveData | null)[]): boolean {
  return write(SLOTS_KEY, { version: SAVE_VERSION, slots });
}

// Les 3 emplacements. La sauvegarde unique d'avant est migree vers le premier emplacement.
export function getSlots(): (SaveData | null)[] {
  const stored = read(SLOTS_KEY) as { slots?: unknown[] } | null;
  if (stored && Array.isArray(stored.slots)) {
    return Array.from({ length: SLOT_COUNT }, (_, i) => validate(stored.slots![i]));
  }
  const slots: (SaveData | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
  const legacy = validate(read(LEGACY_KEY));
  if (legacy) {
    slots[0] = legacy;
    writeSlots(slots);
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      // rien a faire
    }
  }
  return slots;
}

export const loadSlot = (slot: number): SaveData | null => getSlots()[slot] ?? null;
export const hasAnySave = (): boolean => getSlots().some((s) => s !== null);

export function saveSlot(slot: number, data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
  const slots = getSlots();
  slots[slot] = { ...data, version: SAVE_VERSION, savedAt: Date.now() };
  return writeSlots(slots);
}

export function clearSlot(slot: number): void {
  const slots = getSlots();
  slots[slot] = null;
  writeSlots(slots);
}

// Emplacement actif de la partie en cours : la sauvegarde manuelle l'utilise.
let activeSlot = 0;
export const getActiveSlot = (): number => activeSlot;
export const setActiveSlot = (slot: number): void => {
  activeSlot = slot;
};

export function formatPlayTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
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
