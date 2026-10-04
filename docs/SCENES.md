# Carte des scènes narratives

(Le jeu s'appelle **Chronica**, anciennement *A Timeless Journey* : les deux noms désignent le même projet.)

Référence pour reprendre une scène : quels fichiers ouvrir, où sont ses textes, ses données, ses assets et son état
sauvegardé. Une **scène narrative** est une étape de l'histoire ; un **lieu** (salle) est une `RoomScene` jouable.
Une scène peut traverser plusieurs lieux, et un lieu peut servir à plusieurs scènes.

## Conventions

- **Logique** : une classe par lieu dans `src/scenes/rooms/` (`MuseeScene.ts`, `RuelleScene.ts`…), héritant de
  `RoomScene.ts` (déplacements, interactions, sauvegarde, outils de cinématique `runCutscene`, `say`, `wait`,
  `hint`, `panCamera`…). Les séquences d'une scène sont des méthodes `private async` de ces classes.
- **Données d'un lieu** : `src/data/rooms/<lieu>.ts` (+ dossier `src/data/rooms/<lieu>/` pour les manifestes).
  Liste des lieux : `src/data/rooms/registry.ts`. Liaisons entre portes : `src/data/rooms/connections.ts`.
- **Dialogues** : `src/data/dialogues/sceneNN.fr.json` (un fichier par scène, identifiants préfixés par le lieu).
  Chaque fichier est importé dans `src/systems/Dialogues.ts`. Format : [DIALOGUES.md](DIALOGUES.md).
- **Progression** : `gameState.story.sceneNN` (`src/systems/GameState.ts`), types, valeurs par défaut et lecture
  des sauvegardes dans `src/systems/SaveGame.ts`. Un drapeau = un événement unique déjà vécu (ne se rejoue pas).
- **Assets** : `public/assets/rooms/<lieu>/`, `public/assets/characters/<personnage>/` ; sources d'origine dans
  `assets-source/`, scripts de préparation dans `tools/`.

### Ajouter une scène NN

1. `src/data/dialogues/sceneNN.fr.json` + import dans `src/systems/Dialogues.ts`.
2. `SceneNNStory` dans `src/systems/SaveGame.ts` : interface, entrée de `StoryData`, `newStory()`, `cloneStory()`
   et `validStory()`.
3. Logique dans la ou les classes de lieu concernées ; nouveau lieu : données `src/data/rooms/`, classe
   `src/scenes/rooms/`, entrée dans `registry.ts`, `src/config/SceneKeys.ts` et `src/config/GameConfig.ts`, liaisons dans `connections.ts`.
4. Une section ci-dessous.

---

## Scène 01 — Visite du musée

Visite guidée avec la classe, anomalie (Joséphine absente du *Sacre de Napoléon*), rencontre avec l'homme
mystérieux, alarme et fuite de l'homme. Début d'une nouvelle partie.

Lieu :
- Musée (`musee`)

Logique :
- `src/scenes/rooms/MuseeScene.ts` : `intro()`, `present()` (étapes de la visite), `finale()` (départ du groupe,
  `mysteriousArrives()`, `mysteriousFlees()`, `startAlarm()`)
- `src/entities/MuseeCrowd.ts` : classe, visiteurs et agents (placement selon la progression)

Données :
- `src/data/rooms/musee.ts` (galerie, tableaux, visite guidée, homme mystérieux `MYSTERIOUS`)
- `src/data/rooms/musee-pnj.ts` (personnages d'ambiance)
- `src/data/rooms/musee/`

Dialogues :
- `src/data/dialogues/scene01.fr.json` : `prologue.*`, `visite.*`, `issue_secours.fermee`, `ambiance.*`
  (répliques d'ambiance des personnages, aussi utilisées hors scène 01), interlocuteurs communs

Assets :
- `public/assets/rooms/musee/` (sources `assets-source/musee/`, `tools/preparer-musee.py`)
- `public/assets/characters/pnj/` (sources `assets-source/pnj/`, `tools/preparer-pnj.py`)
- `public/assets/characters/gardien/debout.png` (homme mystérieux ; `tools/preparer-gardien.py`)
- Audio optionnel (absent pour l'instant) : `public/assets/audio/` (`src/config/Audio.ts`)

Progression narrative (`story.scene01`) :
- `introDone`, `presentations` (œuvres présentées), `anomalyFound`, `groupLeft`, `encounterDone`,
  `alarmTriggered`, `done` (le héros a rejoint la ruelle)
- Aussi : `gameState.visit` (étape de la visite, œuvres examinées)

Transition :
- Après l'alarme, la sortie de secours du musée (`sortie_secours`) mène à la ruelle → scène 02
  (le début de la scène 02 se joue encore dans le musée : évacuation)

---

## Scène 02 — Évacuation, ruelle et porte impossible

Évacuation du musée, coup de feu dans la ruelle, l'homme mystérieux blessé remet une clé puis meurt, porte
impossible au milieu de la rue, ouverture sur le vaisseau, arrivée dans le vaisseau qui s'allume.

**Cette scène traverse trois lieux et trois fichiers de logique :**

Lieux :
1. Fin du musée — évacuation (`musee`, après `story.scene01.alarmTriggered`)
2. Ruelle du Louvre (`ruelle`)
3. Arrivée dans le vaisseau (`vaisseau`)

Logique :
- `src/scenes/rooms/MuseeScene.ts` : `startEvacuation()`, `onGuardBlock()` (constante `EVACUATION` : agent qui
  bloque le retour)
- `src/entities/MuseeCrowd.ts` : `evacuate()`
- `src/scenes/rooms/RuelleScene.ts` : `arrival()` (coup de feu), `lastWords()` (clé, mort), `unlockDoor()`,
  `enterDoor()`, `updateKeyEffects()` (clé brûlante, attraction), `checkTriggers()` (pensées selon la position)
- `src/scenes/rooms/VaisseauScene.ts` : `arrival()` (porte qui se referme, `powerUp()` des écrans, panoramique)
- `src/entities/Door.ts` (ouverture / fermeture des portes), `src/systems/Sfx.ts` (sons synthétisés)

Données :
- `src/data/rooms/ruelle.ts` (porte impossible `IMPOSSIBLE_DOOR`, allées `AROUND`, homme blessé `WOUNDED`)
- `src/data/rooms/ruelle/manifest.json`
- `src/data/rooms/vaisseau.ts`, `src/data/rooms/vaisseau/scene.json`
- `src/scenes/rooms/vaisseauEffects.ts` (halos des écrans, groupés par équipement)
- `src/data/rooms/connections.ts`

Dialogues :
- `src/data/dialogues/scene02.fr.json` : `musee.evacuation.*`, `musee.porte_entree`, `ruelle.*`, `vaisseau.*`

Assets :
- `public/assets/rooms/ruelle/` (sources `assets-source/ruelle/`, `tools/preparer-ruelle.py`)
- `public/assets/rooms/portes/` dont `porte_ouverte_vaisseau.png` (`tools/preparer-portes.py`)
- `public/assets/characters/gardien/blesse.png` (sources `assets-source/gardien/`)
- `public/assets/rooms/vaisseau/` (sources `assets-source/vaisseau/`)

Progression narrative (`story.scene02`) :
- Musée : `guardWarned`
- Ruelle : `shotHeard`, `keyObtained`, `keyBurnFelt`, `doorPullFelt`, `doorBehindSeen`, `doorBehindOpenSeen`,
  `doorOpened`
- Vaisseau : `vaisseauReached` (fin de la scène)

Transitions :
- Musée `sortie_secours` → ruelle `sortie_secours`
- Ruelle `porte_temps` (après ouverture, interaction) → vaisseau `porte_gauche`
- Fin : exploration libre du vaisseau → scène 03 (à écrire)
