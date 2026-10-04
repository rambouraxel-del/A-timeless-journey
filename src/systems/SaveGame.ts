// Sauvegarde locale (localStorage) : progression du joueur et reglages.
// Toutes les lectures/ecritures sont protegees : navigation privee ou stockage bloque = pas de sauvegarde.

// Cles de stockage : volontairement conservees sous l'ancien nom du jeu (A Timeless Journey, renomme Chronica)
// pour ne perdre aucune sauvegarde ni reglage. Ne pas les renommer sans migration.
const LEGACY_KEY = 'a-timeless-journey:save'; // ancienne sauvegarde unique, migree vers l'emplacement 1
const SLOTS_KEY = 'a-timeless-journey:slots';
const SETTINGS_KEY = 'a-timeless-journey:settings';
const SAVE_VERSION = 3; // 3 : progression narrative rangee par scene (story.scene01, story.scene02)
export const SLOT_COUNT = 3;

// Progression de la visite du musee : etape guidee en cours et oeuvres deja examinees.
export interface VisitData {
  step: number;
  examined: string[];
}

// Progression narrative, rangee par scene (voir docs/SCENES.md). Chaque evenement unique a son drapeau.
// Nouvelle scene : ajouter son interface SceneNNStory, son entree dans StoryData, newStory(), cloneStory() et validStory().

// Scene 01 : visite du musee, anomalie Josephine, homme mysterieux, alarme.
export interface Scene01Story {
  introDone: boolean; // conversation d'arrivee et consigne du professeur
  presentations: string[]; // oeuvres deja presentees par le professeur (la visite avance avec visit.step)
  anomalyFound: boolean; // question sur Josephine posee devant le Sacre
  groupLeft: boolean; // le groupe a quitte la salle
  encounterDone: boolean; // conversation avec l'homme mysterieux terminee
  alarmTriggered: boolean; // alarme declenchee, homme enfui : l'issue de secours est utilisable
  done: boolean; // le heros a rejoint la ruelle (ancien drapeau scene1Done)
}

// Scene 02 : evacuation du musee, ruelle, porte impossible, arrivee dans le vaisseau.
export interface Scene02Story {
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

// Scene 03 : vaisseau (exploration, console, sablier temporel, panne) puis foret.
// Etapes dans l'ordre : chacune n'est atteinte qu'apres la precedente (voir SCENE03_STEPS).
export const SCENE03_STEPS = ['explore', 'signal', 'breakdown', 'forest'] as const;
export type Scene03Step = (typeof SCENE03_STEPS)[number];
export interface Scene03Story {
  // explore : vaisseau allume, console pas encore validee ; signal : signal de detresse suivi, sablier a activer ;
  // breakdown : sablier active puis panne, la porte mene dehors ; forest : le heros a decouvert la foret.
  step: Scene03Step;
  seen: string[]; // pensees ou observations uniques deja vecues (identifiants de scene03.fr.json)
}

// Vrai si l'etape de la scene 3 est atteinte ou depassee.
export const reached = (story: Scene03Story, step: Scene03Step): boolean => SCENE03_STEPS.indexOf(story.step) >= SCENE03_STEPS.indexOf(step);

export interface StoryData {
  scene01: Scene01Story;
  scene02: Scene02Story;
  scene03: Scene03Story;
}

export const newStory = (): StoryData => ({
  scene01: {
    introDone: false,
    presentations: [],
    anomalyFound: false,
    groupLeft: false,
    encounterDone: false,
    alarmTriggered: false,
    done: false,
  },
  scene02: {
    guardWarned: false,
    shotHeard: false,
    keyObtained: false,
    keyBurnFelt: false,
    doorPullFelt: false,
    doorBehindSeen: false,
    doorBehindOpenSeen: false,
    doorOpened: false,
    vaisseauReached: false,
  },
  scene03: { step: 'explore', seen: [] },
});

// Copie independante (la sauvegarde ne doit pas partager ses tableaux avec la partie en cours).
export const cloneStory = (story: StoryData): StoryData => ({
  scene01: { ...story.scene01, presentations: [...story.scene01.presentations] },
  scene02: { ...story.scene02 },
  scene03: { step: story.scene03.step, seen: [...story.scene03.seen] },
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

// Accepte le format par scene ({ scene01: {...}, scene02: {...} }) et l'ancien format a plat (sauvegardes
// d'avant la reorganisation : tous les drapeaux au meme niveau). Drapeau absent = faux.
function validStory(raw: unknown, visit: VisitData): StoryData {
  type Raw = Record<string, unknown>;
  const flat = (raw ?? {}) as Raw;
  const scene = (key: string) => (flat[key] && typeof flat[key] === 'object' ? (flat[key] as Raw) : flat);
  const s1 = scene('scene01');
  const s2 = scene('scene02');
  const s3 = flat.scene03 && typeof flat.scene03 === 'object' ? (flat.scene03 as Raw) : {};
  const flag = (v: unknown) => v === true;
  return {
    scene01: {
      // Ancienne sauvegarde sans recit : une visite deja commencee vaut introduction faite.
      introDone: flag(s1.introDone) || (raw == null && visit.step > 0),
      presentations: Array.isArray(s1.presentations) ? s1.presentations.filter((e): e is string => typeof e === 'string') : [],
      anomalyFound: flag(s1.anomalyFound),
      groupLeft: flag(s1.groupLeft),
      encounterDone: flag(s1.encounterDone),
      alarmTriggered: flag(s1.alarmTriggered),
      done: flag(s1.done) || flag(s1.scene1Done),
    },
    scene02: {
      guardWarned: flag(s2.guardWarned),
      shotHeard: flag(s2.shotHeard),
      keyObtained: flag(s2.keyObtained),
      keyBurnFelt: flag(s2.keyBurnFelt),
      doorPullFelt: flag(s2.doorPullFelt),
      doorBehindSeen: flag(s2.doorBehindSeen),
      doorBehindOpenSeen: flag(s2.doorBehindOpenSeen),
      doorOpened: flag(s2.doorOpened),
      vaisseauReached: flag(s2.vaisseauReached),
    },
    scene03: {
      step: SCENE03_STEPS.includes(s3.step as Scene03Step) ? (s3.step as Scene03Step) : 'explore',
      seen: Array.isArray(s3.seen) ? s3.seen.filter((e): e is string => typeof e === 'string') : [],
    },
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
