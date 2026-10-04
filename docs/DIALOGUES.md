# Dialogues du jeu

Les textes sont rangés par scène dans `src/data/dialogues/` :

- **`src/data/dialogues/scene01.fr.json`** : scène 1 du prologue (musée), répliques d'ambiance, liste des
  interlocuteurs (`heros`, `mysterieux`, `professeur`…) ;
- **`src/data/dialogues/scene02.fr.json`** : scène 2 (évacuation du musée, ruelle, porte impossible, arrivée dans
  le vaisseau) ;
- **`src/data/dialogues/scene03.fr.json`** : scène 3 (vaisseau : exploration, console, sablier temporel, panne ;
  forêt) et les **écrans de la console** (section `console`).

Les fichiers ont la même structure ; un interlocuteur défini dans l'un est utilisable dans l'autre.
Une réplique sans `qui` est une narration (pas de nom affiché).

Le code ne contient que les conditions, les déplacements et les conséquences. Modifier une réplique ne change pas
le déroulement de la scène.

## Structure

```json
"interlocuteurs": { "ines": "Inès", "professeur": "Professeur", ... },
"dialogues": {
  "prologue.intro.camarade": [
    { "qui": "ines", "texte": "Tu as réussi à dormir ?" },
    { "qui": "heros", "texte": "Un peu." },
    { "qui": "heros", "pensee": true, "texte": "Une pensée du héros." }
  ]
},
"indications": { "suivre": "Rejoins le groupe devant « {oeuvre} »." }
```

- `interlocuteurs` : nom affiché pour chaque personnage. Changer « Inès » ici la renomme partout.
- Une réplique = `qui` (un identifiant d'`interlocuteurs`, facultatif), `texte`, et `"pensee": true` pour une
  pensée du héros (affichée en bleu clair, avec « (pensée) » après le nom), ou `"systeme": true` pour un message
  du vaisseau (affiché en cyan).
- `console` (scène 3) : écrans de la console du vaisseau. Chaque écran a un `titre`, des `lignes`
  (`texte` + `ton` : `normal`, `code`, `date`, `alerte`, `attenue` — la couleur d'affichage), un bouton `action`
  facultatif et un bouton `fermer`. Écrans utilisés : `signal`, `confirmation`, `attente`, `panne`.
- `indications` : courts messages en bas de l'écran. `{n}` et `{oeuvre}` sont remplacés par le jeu.

## Modifier ou ajouter une réplique

1. Ouvrir `src/data/dialogues/scene01.fr.json`.
2. Modifier le `texte` voulu, ou ajouter une ligne `{ "qui": "...", "texte": "..." },` à l'endroit souhaité
   dans la liste. Attention aux virgules entre les lignes et aux guillemets (`"`). Pour une apostrophe,
   utiliser `’` ou `'` librement.
3. Enregistrer.

## Voir les modifications dans le jeu

- En local : `npm run dev`, puis ouvrir l'adresse affichée. La page se recharge seule à chaque enregistrement.
- En ligne : pousser sur `main`. GitHub Pages se met à jour en quelques minutes.
- Application mobile : `npm run cap:sync`, puis relancer depuis Xcode.

Un identifiant manquant n'empêche pas le jeu de fonctionner : la boîte affiche « [Dialogue manquant : …] ».

## Identifiants à conserver

Ne pas renommer ni supprimer ces identifiants (le texte à l'intérieur peut changer librement) :

| Identifiant | Moment |
| --- | --- |
| `prologue.intro.camarade` | Arrivée : conversation avec la camarade |
| `prologue.intro.professeur` | Arrivée : consigne du professeur |
| `visite.rappel` | Le joueur essaie de dépasser le groupe (une fois par étape) |
| `visite.<oeuvre>.professeur` | INTERAGIR avec le professeur à l'étape `<oeuvre>` |
| `visite.<oeuvre>.presentation` | Présentation de l'œuvre (une seule fois) |
| `prologue.depart.pensee` | Le groupe vient de partir |
| `prologue.rencontre` | Conversation avec l'homme mystérieux |
| `prologue.alarme` | Déclenchement de l'alarme |
| `issue_secours.fermee` | Issue de secours avant l'alarme |
| `ambiance.<personnage>` | Répliques d'ambiance (étudiants, visiteurs, agents) |
| `indications.etape`, `suivre`, `groupe_attend`, `alarme`, `fuite` | Messages courts |

`<oeuvre>` vaut `liberte`, `radeau`, `sabines` ou `sacre` (ordre de la visite).

Scène 2 (`scene02.fr.json`) :

| Identifiant | Moment |
| --- | --- |
| `musee.evacuation.garde` | Le joueur veut revenir vers la visite : le garde bloque le passage (une fois) |
| `musee.evacuation.rappel` | INTERAGIR avec le garde pendant l'évacuation |
| `musee.porte_entree` | INTERAGIR avec la porte d'entrée du musée |
| `ruelle.arrivee` | Arrivée dans la ruelle vide |
| `ruelle.coup_de_feu` | Coup de feu et chute, intention du héros |
| `ruelle.sortie_secours` | La sortie de secours vue de l'extérieur (fermée) |
| `ruelle.homme.agonie` | Dernières paroles de l'homme mystérieux, remise de la clé |
| `ruelle.homme.mort` | Mort de l'homme |
| `ruelle.homme.corps` | INTERAGIR de nouveau avec le corps |
| `ruelle.cle.brule` | La clé commence à brûler (approche de la porte) |
| `ruelle.porte.attraction` | Attraction ressentie tout près de la porte |
| `ruelle.porte.verrouillee` | Porte sans la clé |
| `ruelle.porte.derriere` | Le héros passe derrière la porte fermée |
| `ruelle.porte.cle` | La clé tourne dans la serrure |
| `ruelle.porte.ouverte` | La porte ouverte montre le vaisseau |
| `ruelle.porte.derriere_ouverte` | Le héros passe derrière la porte ouverte |
| `vaisseau.arrivee` | Arrivée dans le vaisseau (porte refermée, consoles allumées) |
| `vaisseau.porte` | INTERAGIR avec la porte du vaisseau après l'arrivée |
| `indications.objectif_suivre`, `evacuation`, `objectif_bruit`, `cle_obtenue`, `objectif_porte`, `tour_porte`, `objectif_seuil`, `objectif_vaisseau` | Messages courts et objectifs |

## Progression enregistrée

La sauvegarde garde l'étape de visite et la progression narrative rangée par scène dans `gameState.story`
(`src/systems/SaveGame.ts`) : `story.scene01` (`introDone`, `presentations`, `anomalyFound`, `groupLeft`,
`encounterDone`, `alarmTriggered`, `done`) et `story.scene02` (`guardWarned`, `shotHeard`, `keyObtained`,
`keyBurnFelt`, `doorPullFelt`, `doorBehindSeen`, `doorBehindOpenSeen`, `doorOpened`, `vaisseauReached`) et
`story.scene03` (`step` : `explore` → `signal` → `breakdown` → `forest`, et `seen`, la liste des pensées uniques
déjà vécues).
Un événement déjà vécu ne se rejoue pas. Détail par scène : [SCENES.md](SCENES.md).
