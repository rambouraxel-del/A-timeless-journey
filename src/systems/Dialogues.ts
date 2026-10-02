import data from '@/data/dialogues/dialogues.fr.json';
import type { DialogueLine } from './Dialogue';

// Textes du jeu, lus dans src/data/dialogues/dialogues.fr.json (voir docs/DIALOGUES.md).
// Le code ne connait que les identifiants : modifier une replique ne change pas la logique.

interface RawLine {
  qui?: string;
  texte: string;
  pensee?: boolean;
}

const speakers = data.interlocuteurs as Record<string, string>;
const dialogues = data.dialogues as unknown as Record<string, RawLine[]>;
const hints = data.indications as Record<string, string>;

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
    console.warn(`Dialogue manquant dans dialogues.fr.json : ${id}`);
    return [{ text: `[Dialogue manquant : ${id}]` }];
  }
  return raw.map((l) => ({
    speaker: l.qui ? (speakers[l.qui] ?? l.qui) + (l.pensee ? data.suffixe_pensee : '') : undefined,
    text: fill(l.texte, vars),
    thought: l.pensee === true,
  }));
}

// Courte indication affichee en bas de la scene.
export function indication(id: string, vars?: Vars): string {
  const text = hints[id];
  if (!text) console.warn(`Indication manquante dans dialogues.fr.json : ${id}`);
  return fill(text ?? `[${id}]`, vars);
}
