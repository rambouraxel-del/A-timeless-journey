// Personnages d'ambiance du musee : un cours devant l'etape active (professeur + 10 etudiants), des
// visiteurs et deux agents de securite. Positions en pixels d'origine de la galerie (6144 x 704).

export type NpcRole = 'professeur' | 'etudiant' | 'visiteur' | 'agent';

export interface NpcSpec {
  id: string;
  sprite: string; // cle dans pnj-sprites.json
  role: NpcRole;
  // Taille de la partie visible, relative au heros (adultes un peu plus grands, etudiants plus petits).
  size: number;
  label: string;
  // Identifiant du dialogue d'ambiance (dialogues.fr.json) ; absent : personnage non interactif.
  dialogue?: string;
  // Groupe du cours : decalage (x, y) par rapport au centre du tableau presente, et regard (1 : vers la droite).
  group?: { dx: number; dy: number; face: -1 | 1 };
  // Groupe du cours avant la visite : decalage (x, y) par rapport au point d'arrivee du heros, et regard.
  entrance?: { dx: number; dy: number; face: -1 | 1 };
  // Agents : points de la ronde.
  patrol?: number[];
}

type Spot = { dx: number; dy: number; face: -1 | 1 };
const student = (n: number, sprite: string, size: number, group: Spot, entrance: Spot, talks = false): NpcSpec => ({
  id: `etudiant_${n}`,
  sprite: `etudiants/${sprite}`,
  role: 'etudiant',
  size,
  label: 'Étudiant',
  group,
  entrance,
  dialogue: talks ? `ambiance.etudiant_${n}` : undefined,
});

export const NPCS: NpcSpec[] = [
  { id: 'professeur', sprite: 'professeurs/01-homme-veste-marron', role: 'professeur', size: 1.06, label: 'Professeur', group: { dx: 100, dy: 3, face: -1 }, entrance: { dx: 228, dy: 2, face: -1 } },

  // Les etudiants forment un petit groupe irregulier (a l'entree : autour du heros, avant la visite) a gauche du professeur, la plupart tournes vers lui.
  student(1, '01-garcon-blond', 0.9, { dx: -318, dy: 8, face: 1 }, { dx: -205, dy: 8, face: 1 }),
  student(2, '02-fille-chatain', 0.88, { dx: -262, dy: 1, face: 1 }, { dx: 55, dy: 3, face: -1 }, true),
  student(3, '03-garcon-sweat-jaune', 0.93, { dx: -216, dy: 11, face: -1 }, { dx: -160, dy: 12, face: 1 }),
  student(4, '04-fille-sweat-lavande', 0.89, { dx: -170, dy: 4, face: 1 }, { dx: -118, dy: 4, face: 1 }),
  student(5, '05-garcon-veste-jean', 0.92, { dx: -126, dy: 12, face: 1 }, { dx: 122, dy: 11, face: 1 }, true),
  student(6, '06-fille-rousse', 0.9, { dx: -86, dy: 2, face: 1 }, { dx: -78, dy: 2, face: 1 }),
  student(7, '07-garcon-chemise-verte', 0.91, { dx: -46, dy: 9, face: 1 }, { dx: 92, dy: 6, face: 1 }),
  student(8, '08-fille-sweat-terracotta', 0.88, { dx: -4, dy: 5, face: -1 }, { dx: 158, dy: 9, face: -1 }, true),
  student(9, '09-garcon-sweat-gris', 0.93, { dx: -290, dy: 13, face: 1 }, { dx: 188, dy: 13, face: -1 }),
  student(10, '10-fille-veste-jean', 0.9, { dx: 30, dy: 10, face: 1 }, { dx: -40, dy: 10, face: 1 }),

  // Visiteurs : les trois autres professeurs et les visiteurs du dossier.
  { id: 'visiteur_1', sprite: 'visiteurs/01-jeune-homme', role: 'visiteur', size: 1.03, label: 'Visiteur', dialogue: 'ambiance.visiteur_1' },
  { id: 'visiteur_2', sprite: 'visiteurs/02-femme', role: 'visiteur', size: 1.02, label: 'Visiteuse' },
  { id: 'visiteur_3', sprite: 'visiteurs/03-homme-age', role: 'visiteur', size: 1.0, label: 'Visiteur', dialogue: 'ambiance.visiteur_3' },
  { id: 'visiteur_4', sprite: 'professeurs/02-femme-veste-bleue', role: 'visiteur', size: 1.04, label: 'Visiteuse', dialogue: 'ambiance.visiteur_4' },
  { id: 'visiteur_5', sprite: 'professeurs/03-homme-cardigan-vert', role: 'visiteur', size: 1.05, label: 'Visiteur' },
  { id: 'visiteur_6', sprite: 'professeurs/04-femme-cardigan-bordeaux', role: 'visiteur', size: 1.0, label: 'Visiteuse' },

  // Agents : l'un pres de l'entree, l'autre dans la grande salle.
  { id: 'agent_1', sprite: 'securite/01-agent-homme', role: 'agent', size: 1.07, label: 'Agent de sécurité', patrol: [430, 1010, 1540], dialogue: 'ambiance.agent_1' },
  { id: 'agent_2', sprite: 'securite/02-agent-femme', role: 'agent', size: 1.05, label: 'Agent de sécurité', patrol: [3340, 4620, 4990], dialogue: 'ambiance.agent_2' },
];

// Points d'arret des visiteurs (x d'origine) : de part et d'autre des tableaux, plus quelques points libres.
// 'face' : regard vers le tableau (1 : vers la droite).
export const EXTRA_SPOTS = [900, 1540, 2560, 3300, 4100, 4830, 5650];
export const SPOT_MIN_X = 300; // pas pres de la porte d'entree
export const SPOT_SPACING = 120; // ecart minimal entre deux personnages
export const GROUP_ZONE = 340; // demi-largeur reservee au groupe devant son tableau
