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
Sur ordinateur : flèches ou ZQSD pour bouger, Maj pour courir, Espace ou E pour interagir.

## Écran et netteté

- Le jeu est dessiné à la **résolution réelle de l'écran** (un canvas de 1170 × 2532 px sur un iPhone 390 × 844 pt) : aucun agrandissement flou.
- Les positions restent en **pixels logiques** (~360 de large). `RENDER_SCALE` (1 à 4, entier) = pixels d'écran par pixel logique ; le décor et le héros sont agrandis d'un facteur entier, sans lissage.
- Le format suit le téléphone (de 16:9 à 860/360). **Environ 66 % de la hauteur** pour la scène, le reste pour le panneau de contrôle.
- **HUD** (haut) : emblème temporel, cœurs de vie, jauge d'énergie (= endurance), bouton menu.
- **Panneau** (bas) : joystick, INTERAGIR (objet à portée le plus proche), COURIR (à maintenir), boîte de dialogue au-dessus des commandes. Les commandes grandissent (jusqu'à ×1,3) sur les écrans allongés.

## Architecture

```
public/assets/            Graphismes (fournis par toi ou libres de droits, jamais générés)
  characters/hero_temp/   Héros TEMPORAIRE (LPC) + CREDITS.md
  rooms/                  Décors des salles, une image par couche
  ui/x2 x3 x4/            Interface haute définition (un dossier par densité d'écran)
  fonts/                  Police VT323 (licence OFL)
assets-source/ui/         Maquette et planches d'UI d'origine
src/
  config/                 Dimensions (Layout), liste des assets (Assets), scènes (SceneKeys)
  data/rooms/             Définition des salles : chemins, objets, point d'arrivée
  data/dialogues/         (vide) futurs dialogues
  world/                  Couches de profondeur, graphe de déplacement
  entities/               Joueur
  systems/                Commandes, interactions, bus d'événements, type de dialogue
  scenes/                 Chargement, interface (UIScene), salles (rooms/)
  ui/                     Joystick, boutons, boîte de dialogue
tools/                    Assemblage du héros temporaire, découpe de l'UI (decouper-ui.py)
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
Pour une salle de 2160 px sur un écran de 390 px logiques : far = 780 px, near = 1440 px, main = 2160 px, foreground = 2700 px. La hauteur suit `GAME_VIEW.height` (≈ 425 px en 16:9, ≈ 557 px sur un iPhone).

## Assets

Aucun asset n'est généré. Le héros actuel est **temporaire** : assemblé depuis le projet libre LPC (Liberated Pixel Cup), attribution obligatoire, voir `public/assets/characters/hero_temp/CREDITS.md`.

L'interface vient des planches fournies (`assets-source/ui/`) : `python tools/decouper-ui.py` les découpe en 3 densités dans `public/assets/ui/x2|x3|x4/` (le jeu charge celle de l'appareil) et écrit `src/config/UiSizes.generated.ts`. Pour modifier un élément, modifie la planche puis relance le script.

Police : [VT323](https://fonts.google.com/specimen/VT323), licence SIL Open Font License (`public/assets/fonts/VT323-OFL.txt`).
