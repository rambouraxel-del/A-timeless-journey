import scene01 from '@/data/dialogues/scene01.fr.json';
import scene02 from '@/data/dialogues/scene02.fr.json';
import scene03 from '@/data/dialogues/scene03.fr.json';
import type { DialogueLine } from './Dialogue';

// Textes du jeu, lus dans les fichiers de src/data/dialogues/ (voir docs/DIALOGUES.md) :
//   scene01.fr.json : scene 1 du prologue (musee) et repliques d'ambiance ;
//   scene02.fr.json : scene 2 (evacuation, ruelle, porte, arrivee dans le vaisseau) ;
//   scene03.fr.json : scene 3 (vaisseau : console, sablier temporel, panne ; foret) et ecrans de la console.
// Le code ne connait que les identifiants : modifier une replique ne change pas la logique.

interface RawLine {
  qui?: string;
  texte: string;
  pensee?: boolean;
  systeme?: boolean;
}

interface DialogueFile {
  suffixe_pensee?: string;
  interlocuteurs?: Record<string, string>;
  dialogues?: Record<string, RawLine[]>;
  indications?: Record<string, string>;
  console?: Record<string, ConsoleScreen>;
}

// Ecran de la console du vaisseau : titre, lignes (avec un ton d'affichage) et boutons.
export type ConsoleTone = 'normal' | 'code' | 'date' | 'alerte' | 'attenue';
export interface ConsoleScreen {
  titre: string;
  lignes: { ton?: ConsoleTone; texte: string }[];
  action?: string; // bouton d'action (absent : seulement Fermer)
  fermer: string;
}
const files = [scene01, scene02, scene03] as unknown as DialogueFile[];
const speakers: Record<string, string> = Object.assign({}, ...files.map((f) => f.interlocuteurs ?? {}));
const dialogues: Record<string, RawLine[]> = Object.assign({}, ...files.map((f) => f.dialogues ?? {}));
const hints: Record<string, string> = Object.assign({}, ...files.map((f) => f.indications ?? {}));
const consoleScreens: Record<string, ConsoleScreen> = Object.assign({}, ...files.map((f) => f.console ?? {}));
const thoughtSuffix = scene01.suffixe_pensee;

type Vars = Record<string, string | number>;

// Remplace {nom} par la valeur correspondante.
const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

export function hasDialogue(id: string): boolean {
  return Array.isArray(dialogues[id]) && dialogues[id].length > 0;
}

// Repliques d'un dialogue. Un identifiant absent affiche un message visible plutot que de bloquer le jeu.
export function dialogue(id: string, vars?: Vars): DialogueLine[] {
  const raw = dialogues[id];
  if (!hasDialogue(id)) {
    console.warn(`Dialogue manquant dans src/data/dialogues : ${id}`);
    return [{ text: `[Dialogue manquant : ${id}]` }];
  }
  return raw.map((l) => ({
    speaker: l.qui ? (speakers[l.qui] ?? l.qui) + (l.pensee ? thoughtSuffix : '') : undefined,
    text: fill(l.texte, vars),
    thought: l.pensee === true,
    system: l.systeme === true,
  }));
}

// Courte indication affichee en bas de la scene.
export function indication(id: string, vars?: Vars): string {
  const text = hints[id];
  if (!text) console.warn(`Indication manquante dans src/data/dialogues : ${id}`);
  return fill(text ?? `[${id}]`, vars);
}

// Ecran de la console (scene03.fr.json, section "console").
export function consoleScreen(id: string): ConsoleScreen {
  const screen = consoleScreens[id];
  if (!screen) console.warn(`Ecran de console manquant dans src/data/dialogues : ${id}`);
  return screen ?? { titre: '', lignes: [{ texte: `[${id}]` }], fermer: 'Fermer' };
}
