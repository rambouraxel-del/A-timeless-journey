# Dialogues du jeu

Tous les textes de la scène 1 du prologue (musée) sont dans un seul fichier :

**`src/data/dialogues/dialogues.fr.json`**

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
  pensée du héros (affichée en bleu clair, avec « (pensée) » après le nom).
- `indications` : courts messages en bas de l'écran. `{n}` et `{oeuvre}` sont remplacés par le jeu.

## Modifier ou ajouter une réplique

1. Ouvrir `src/data/dialogues/dialogues.fr.json`.
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

## Progression enregistrée

La sauvegarde garde l'étape de visite, les présentations terminées et les drapeaux `introDone`, `anomalyFound`,
`groupLeft`, `encounterDone`, `alarmTriggered` et `scene1Done` (`src/systems/SaveGame.ts`). Un événement déjà
vécu ne se rejoue pas.
