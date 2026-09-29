# A Timeless Journey

Jeu narratif 2D en pixel art, vue latérale, pour téléphone (portrait).
Le joueur traverse des mondes, résout des énigmes et parle aux personnages. Pas de saut : on marche, on monte des escaliers et des échelles, on touche les objets pour interagir.

## Lancer le jeu

```bash
npm install
npm run dev        # http://localhost:5173 (aussi accessible depuis un téléphone sur le même Wi-Fi)
npm run build      # vérifie les types et compile dans dist/
```

Chaque push sur `main` publie le jeu sur GitHub Pages (`.github/workflows/deploy.yml`).
Sur ordinateur : flèches ou ZQSD pour tester.

## Écran

- Résolution logique **360 × 640** (portrait), mise à l'échelle de l'écran.
- **2/3 haut** : la scène (360 × 427). **1/3 bas** : joystick, boutons, boîtes de dialogue.
- Une salle standard = **6 écrans de long** (2160 px).

## Architecture

```
public/assets/            Graphismes (fournis par toi ou libres de droits, jamais générés)
  characters/hero_temp/   Héros TEMPORAIRE (LPC) + CREDITS.md
  rooms/                  Décors des salles, une image par couche
  ui/                     Interface
src/
  config/                 Dimensions (Layout), liste des assets (Assets), scènes (SceneKeys)
  data/rooms/             Définition des salles : chemins, objets, point d'arrivée
  data/dialogues/         (vide) futurs dialogues
  world/                  Couches de profondeur, graphe de déplacement
  entities/               Joueur
  systems/                Commandes, interactions, bus d'événements, type de dialogue
  scenes/                 Chargement, interface (UIScene), salles (rooms/)
  ui/                     Joystick, boutons, boîte de dialogue
tools/                    Script d'assemblage du héros temporaire
```

## Construire une salle

Une salle = un fichier dans `src/data/rooms/` + une scène dans `src/scenes/rooms/` (voir `greyRoom.ts` et `GreyRoomScene.ts`).

- **Chemins** : `floor` (sol), `stairs` (escalier), `ladder` (échelle). Quand un escalier ou une échelle touche un sol, un embranchement est créé automatiquement ; le joueur prend la direction qui correspond le mieux au joystick.
- **Objets interactifs** : `chest`, `door`, `computer`, `character`, `object`. Un point d'exclamation apparaît quand le joueur est assez près ; un tap déclenche l'interaction (pour l'instant : « Interaction à définir »).

## Couches de profondeur

| Couche | Défilement | Rôle |
|---|---|---|
| `sky` | fixe | ciel / fond uni |
| `far` | 0,25 | décor lointain |
| `near` | 0,6 | décor intermédiaire |
| `main` | 1 | sols, murs, escaliers (même plan que le joueur) |
| *(objets, joueur)* | 1 | |
| `foreground` | 1,3 | premier plan, passe devant le joueur |

Largeur d'une image de couche = `360 + (largeur de la salle − 360) × défilement`.
Pour une salle de 2160 px : far = 810 px, near = 1440 px, main = 2160 px, foreground = 2700 px. Hauteur : 427 px.

## Assets

Aucun asset n'est généré. Le héros actuel est **temporaire** : assemblé depuis le projet libre LPC (Liberated Pixel Cup), attribution obligatoire, voir `public/assets/characters/hero_temp/CREDITS.md`.
