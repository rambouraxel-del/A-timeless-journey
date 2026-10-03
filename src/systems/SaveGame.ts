// Sauvegarde locale (localStorage) : progression du joueur et reglages.
// Toutes les lectures/ecritures sont protegees : navigation privee ou stockage bloque = pas de sauvegarde.

const LEGACY_KEY = 'a-timeless-journey:save'; // ancienne sauvegarde unique, migree vers l'emplacement 1
const SLOTS_KEY = 'a-timeless-journey:slots';
const SETTINGS_KEY = 'a-timeless-journey:settings';
const SAVE_VERSION = 2;
export const SLOT_COUNT = 3;

// Progression de la visite du musee : etape guidee en cours et oeuvres deja examinees.
export interface VisitData {
  step: number;
  examined: string[];
}

// Progression narrative du prologue (scene 1 : musee). Chaque evenement unique a son drapeau.
export interface StoryData {
  introDone: boolean; // conversation d'arrivee et consigne du professeur
  presentations: string[]; // oeuvres deja presentees par le professeur (la visite avance avec visit.step)
  anomalyFound: boolean; // question sur Josephine posee devant le Sacre
  groupLeft: boolean; // le groupe a quitte la salle
  encounterDone: boolean; // conversation avec l'homme mysterieux terminee
  alarmTriggered: boolean; // alarme declenchee, homme enfui : l'issue de secours est utilisable
  scene1Done: boolean; // le heros a rejoint la ruelle
  // Scene 2 (evacuation, ruelle, porte impossible, arrivee dans le vaisseau).
  guardWarned: boolean; // le garde a bloque le retour dans le musee
  shotHeard: boolean; // coup de feu entendu en arrivant dans la ruelle
  keyObtained: boolean; // l'homme mysterieux a remis la cle, puis il est mort
  keyBurnFelt: boolean; // premiere sensation de brulure de la cle
  doorPullFelt: boolean; // attraction ressentie pres de la porte
  doorBehindSeen: boolean; // le heros est passe derriere la porte fermee
  doorBehindOpenSeen: boolean; // ... et derriere la porte ouverte
  doorOpened: boolean; // porte ouverte avec la cle
  vaisseauReached: boolean; // arrivee dans le vaisseau (fin de la scene 2)
}

export const newStory = (): StoryData => ({
  introDone: false,
  presentations: [],
  anomalyFound: false,
  groupLeft: false,
  encounterDone: false,
  alarmTriggered: false,
  scene1Done: false,
  guardWarned: false,
  shotHeard: false,
  keyObtained: false,
  keyBurnFelt: false,
  doorPullFelt: false,
  doorBehindSeen: false,
  doorBehindOpenSeen: false,
  doorOpened: false,
  vaisseauReached: false,
});

export interface SaveData {
  version: number;
  room: string;
  // Nom du lieu affiche dans la liste des emplacements.
  place: string;
  // Position horizontale dans la salle, de 0 a 1 (independante de la taille de l'ecran).
  x: number;
  // Position verticale (0 a 1 de la hauteur de la salle) : salles a plusieurs niveaux de sol.
  y?: number;
  facing: -1 | 1;
  health: number;
  stamina: number;
  // Temps de jeu cumule, en secondes.
  playTime: number;
  visit: VisitData;
  story: StoryData;
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

function validVisit(raw: unknown): VisitData {
  const v = raw as Partial<VisitData> | null | undefined;
  const step = isNumber(v?.step) ? Math.max(0, Math.floor(v.step)) : 0;
  const examined = Array.isArray(v?.examined) ? v.examined.filter((e): e is string => typeof e === 'string') : [];
  return { step, examined };
}

function validStory(raw: unknown, visit: VisitData): StoryData {
  const s = (raw ?? {}) as Partial<StoryData>;
  const flag = (v: unknown) => v === true;
  return {
    // Ancienne sauvegarde sans recit : une visite deja commencee vaut introduction faite.
    introDone: flag(s.introDone) || (raw == null && visit.step > 0),
    presentations: Array.isArray(s.presentations) ? s.presentations.filter((e): e is string => typeof e === 'string') : [],
    anomalyFound: flag(s.anomalyFound),
    groupLeft: flag(s.groupLeft),
    encounterDone: flag(s.encounterDone),
    alarmTriggered: flag(s.alarmTriggered),
    scene1Done: flag(s.scene1Done),
    guardWarned: flag(s.guardWarned),
    shotHeard: flag(s.shotHeard),
    keyObtained: flag(s.keyObtained),
    keyBurnFelt: flag(s.keyBurnFelt),
    doorPullFelt: flag(s.doorPullFelt),
    doorBehindSeen: flag(s.doorBehindSeen),
    doorBehindOpenSeen: flag(s.doorBehindOpenSeen),
    doorOpened: flag(s.doorOpened),
    vaisseauReached: flag(s.vaisseauReached),
  };
}

function validate(raw: unknown): SaveData | null {
  const data = raw as Partial<SaveData> | null;
  if (!data || typeof data.room !== 'string') return null;
  if (!isNumber(data.x) || !isNumber(data.health) || !isNumber(data.stamina) || (data.facing !== -1 && data.facing !== 1)) return null;
  return {
    version: SAVE_VERSION,
    room: data.room,
    place: typeof data.place === 'string' ? data.place : 'Vaisseau',
    x: Math.min(1, Math.max(0, data.x)),
    y: isNumber(data.y) ? Math.min(1, Math.max(0, data.y)) : undefined,
    facing: data.facing,
    health: data.health,
    stamina: data.stamina,
    playTime: isNumber(data.playTime) ? Math.max(0, data.playTime) : 0,
    visit: validVisit(data.visit),
    story: validStory(data.story, validVisit(data.visit)),
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
