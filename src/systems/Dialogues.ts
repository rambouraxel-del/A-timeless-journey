import scene01 from '@/data/dialogues/scene01.fr.json';
import scene02 from '@/data/dialogues/scene02.fr.json';
import type { DialogueLine } from './Dialogue';

// Textes du jeu, lus dans les fichiers de src/data/dialogues/ (voir docs/DIALOGUES.md) :
//   scene01.fr.json : scene 1 du prologue (musee) et repliques d'ambiance ;
//   scene02.fr.json : scene 2 (evacuation, ruelle, porte, arrivee dans le vaisseau).
// Le code ne connait que les identifiants : modifier une replique ne change pas la logique.

interface RawLine {
  qui?: string;
  texte: string;
  pensee?: boolean;
}

interface DialogueFile {
  suffixe_pensee?: string;
  interlocuteurs?: Record<string, string>;
  dialogues?: Record<string, RawLine[]>;
  indications?: Record<string, string>;
}
const files = [scene01, scene02] as unknown as DialogueFile[];
const speakers: Record<string, string> = Object.assign({}, ...files.map((f) => f.interlocuteurs ?? {}));
const dialogues: Record<string, RawLine[]> = Object.assign({}, ...files.map((f) => f.dialogues ?? {}));
const hints: Record<string, string> = Object.assign({}, ...files.map((f) => f.indications ?? {}));
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
  }));
}

// Courte indication affichee en bas de la scene.
export function indication(id: string, vars?: Vars): string {
  const text = hints[id];
  if (!text) console.warn(`Indication manquante dans src/data/dialogues : ${id}`);
  return fill(text ?? `[${id}]`, vars);
}
