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

## Démarrage, menu et sauvegarde

- `BootScene` charge le fond, le titre et les boutons ; `TitleScene` les affiche puis charge tout le reste avec une **barre dorée** liée au chargement réel. La barre disparaît, puis les 3 boutons apparaissent en montant légèrement.
- Un même fond (`assets/menu/fond.jpg`) sert au chargement et au menu : il remplit l'écran sans déformation, aligné en bas pour que le héros reste au-dessus des boutons.
- **Continuer** ouvre la liste des 3 emplacements (vides grisés) ; **Nouvelle partie** propose un emplacement et demande confirmation avant d'écraser. **Paramètres** : effets d'ambiance oui/non, effacer une sauvegarde.
- Le bouton MENU en jeu ouvre le menu **Pause** (jeu suspendu) : Reprendre, Sauvegarder, Paramètres, Retour à l'accueil (confirmation si la progression n'est pas sauvegardée). Échap fait de même au clavier.
- 3 emplacements en `localStorage` (`src/systems/SaveGame.ts`) : lieu, temps de jeu, date, position, orientation, vie, endurance. Sauvegarde manuelle dans l'emplacement actif (pas de sauvegarde automatique). L'ancienne sauvegarde unique est migrée vers l'emplacement 1.
- Images du menu : sources dans `assets-source/menu/`, préparées par `python tools/preparer-menu.py`.

## Écran et netteté

- Le jeu est dessiné à la **résolution réelle de l'écran** (un canvas de 1170 × 2532 px sur un iPhone 390 × 844 pt) : aucun agrandissement flou.
- Les positions restent en **pixels logiques** (~360 de large). `RENDER_SCALE` (1 à 4, entier) = pixels d'écran par pixel logique ; le décor et le héros sont agrandis d'un facteur entier, sans lissage.
- Le format suit le téléphone (de 16:9 à 860/360). **Environ 69 % de la hauteur** pour la scène, le reste pour le panneau de contrôle.
- **HUD** (haut) : emblème temporel, cœurs de vie, jauge d'énergie (= endurance), bouton menu.
- **Panneau** (bas) : joystick, INTERAGIR (objet à portée le plus proche), COURIR (à maintenir). Les commandes grandissent (jusqu'à ×1,3) sur les écrans allongés.
- **Dialogues** : ils remplacent les commandes dans le panneau bas, avec un bouton Continuer / Fermer (ou un tap sur la boîte, E, Espace). Déplacements bloqués pendant l'affichage, caméra immobile. Cartouche du nom ajusté au texte (sur plusieurs lignes au-delà de 60 % de la largeur), texte paginé selon la place, encadré du portrait masqué si aucun portrait n'est fourni.

## Architecture

```
public/assets/            Graphismes (fournis par toi ou libres de droits, jamais générés)
  characters/hero/        Héros (planche assemblée depuis assets-source/characters/hero/)
  rooms/                  Décors des salles, une image par couche
  ui/x2 x3 x4/            Interface haute définition (un dossier par densité d'écran)
  fonts/                  Police VT323 (licence OFL)
assets-source/ui/         Maquette et planches d'UI d'origine
assets-source/characters/ Animations d'origine du héros (GIF/PNG)
src/
  config/                 Dimensions (Layout), liste des assets (Assets), scènes (SceneKeys)
  data/rooms/             Définition des salles : chemins, objets, point d'arrivée
  data/dialogues/         (vide) futurs dialogues
  world/                  Couches de profondeur, graphe de déplacement
  entities/               Joueur
  systems/                Commandes, interactions, bus d'événements, type de dialogue
  scenes/                 Chargement, interface (UIScene), salles (rooms/)
  ui/                     Joystick, boutons, boîte de dialogue
tools/                    Assemblage du héros, découpe de l'UI, préparation du menu (preparer-menu.py)
```

## La salle du vaisseau

Salle unique de **4 écrans de long**, un seul niveau, construite depuis le pack `A-Timeless-Journey_Pack-Vaisseau` (images dans `public/assets/rooms/vaisseau/`, manifeste `src/data/rooms/vaisseau/scene.json`, notes d'origine dans `assets-source/vaisseau/`).

- Le pack est calé sur 2880 × 1080 px de texture. Il est adapté à chaque téléphone : `sx = largeur de vue / 720`, `sy = hauteur de vue / 1080`, largeur de salle = 4 × la vue. Les panneaux remplissent la vue, les équipements gardent leurs proportions (`min(sx, sy)`) et posent leurs pieds au sol.
- Profondeurs : fond 10, structure 30, équipements 40, héros 50, repères 55, rebord 60, angles proches 70 (léger décalage de parallaxe, recalé aux deux extrémités de la salle).
- Déplacement : un seul segment de sol. Interactions : 2 portes, réacteur, console, écran mural, 2 armoires, banquette (réponse générique pour l'instant, aucune destination ni scénario).
- Ambiance (`vaisseauEffects.ts`) : halo cyan pulsant et particules autour du réacteur, voyants et lumières qui pulsent ou clignotent. Les images restent statiques.
- Le héros est affiché ×1,3 dans cette salle (`heroScale` dans `vaisseau.ts`) pour rester proportionné aux équipements.

## Le musée

- `src/data/rooms/musee.ts` : galerie 6144 × 704 (4 parties de 1536, `public/assets/rooms/musee/`), échelle unique S = hauteur de la vue / 704, héros à l'échelle de référence. Images préparées par `python tools/preparer-musee.py` (sources : `assets-source/musee/`).
- Neuf tableaux interactifs : INTERAGIR ouvre l'œuvre en grand (fond opaque) avec nom et texte dans le dialogue. Visite guidée Liberté → Radeau → Sabines → Sacre ; progression et œuvres examinées sauvegardées.
- Ambiance : 19 personnages immobiles (`assets-source/pnj/`, `python tools/preparer-pnj.py`) : cours (professeur + 10 étudiants) devant l'étape active, visiteurs, agents (`musee-pnj.ts`, `MuseeCrowd.ts`). Ils ne changent de place que hors de la vue ; quelques-uns répondent à INTERAGIR.
- Portes : `src/data/rooms/connections.ts` (vaisseau ↔ musée provisoire ; sortie de secours du musée ↔ ruelle). La porte du vaisseau (`portes.ts`, `Door.ts`) est en miroir selon sa place dans la salle ; la sortie de secours est une image séparée (`tools/preparer-portes.py`).
- Musique : déposer `public/assets/audio/musee-galerie.mp3` et `musee-sacre.mp3` (`src/config/Audio.ts`) ; sans fichiers, silence.

## Scène 1 du prologue (musée)

- Une nouvelle partie commence à l'entrée du musée : conversation, consigne du professeur, puis visite guidée en 4 étapes (Liberté → Radeau → Sabines → Sacre) avec limite de progression. Devant le Sacre : anomalie de Joséphine, départ du groupe, homme mystérieux, alarme, fuite ; l'issue de secours mène alors à la ruelle.
- Logique : `src/scenes/rooms/MuseeScene.ts` ; état : `gameState.story` (sauvegardé). Textes : **`src/data/dialogues/dialogues.fr.json`** — voir [docs/DIALOGUES.md](docs/DIALOGUES.md).
- Homme mystérieux : `public/assets/characters/gardien/gardien.png` (remplaçable, mis à l'échelle automatiquement). Alarme : déposer `public/assets/audio/alarme.mp3` pour le son.

## La ruelle du Louvre

- `src/data/rooms/ruelle.ts` + `RuelleScene.ts` : pack « Ruelle-pack-complet » — monde de 5397 × 1448, 12 images (ciel, 3 sections de bâtiments lointains, 4 de façades, 4 de sol) placées aux coordonnées de `src/data/rooms/ruelle/manifest.json`. Correctifs appliqués : bâtiments lointains remontés à Y = −180 (les trois ensemble, X et parallaxe inchangés) ; sol restauré depuis le premier décor validé (pack « Ruelle-premier-sol-restaure » : `sol-01` à `sol-04`, 280 px à Y = 1168, X = 0 / 1316 / 2633 / 3949, sans recouvrement). Le `sol-03.png` reçu était tronqué : il a été reconstitué avec la recette exacte du pack (ancien décor 4344 px agrandi uniformément en nearest à 5397 px), vérifiée pixel pour pixel sur les trois autres sols et sur les 119 lignes lisibles du fichier reçu. Sources et consignes : `assets-source/ruelle/` ; copie vers le jeu : `python tools/preparer-ruelle.py` (aucune retouche d'image).
- Échelle unique hauteur de vue / 1448, héros à la taille du musée, pieds à Y = 1168. Ordre : fond bleu #52ADF2, ciel, bâtiments, sol, façades, héros.
- Parallaxe : ciel 0,15 · bâtiments lointains 0,65 · sol et façades 1 (collisions, porte et interactions dans le repère du monde). Un facteur et un repère communs par couche ; la couverture est vérifiée au chargement (avertissement en console).
- Les images sont chargées à l'entrée de la scène et libérées à sa sortie (mémoire).
- Sortie de secours dessinée dans les façades (X ≈ 380), statique : interaction `sortie_secours` → musée (`connections.ts`). Limite de marche à droite devant l'angle du mur de retour (X ≈ 5000).

## Construire une autre salle

Une salle = un fichier dans `src/data/rooms/` + une scène dans `src/scenes/rooms/` qui étend `RoomScene`. Sans surcharge, `RoomScene` utilise les couches génériques ci-dessous ; le vaisseau surcharge `buildScenery()` pour poser ses propres panneaux.

- **Chemins** : `floor` (sol), `stairs` (escalier), `ladder` (échelle) ; un embranchement est créé quand ils se touchent.
- **Objets interactifs** : `chest`, `door`, `computer`, `character`, `object`. Parmi les objets à portée, un seul est sélectionné et entouré d'un halo doré : celui qui est devant le héros (le plus proche d'abord), sinon le plus proche. La sélection suit les déplacements et le regard ; INTERAGIR n'agit que sur l'objet entouré (un tap direct sur un objet à portée fonctionne aussi). `standY` et `reachX` règlent l'endroit où le héros se place et la largeur de la zone.

## Couches génériques (RoomScene)

| Couche | Défilement | Rôle |
|---|---|---|
| `sky` | fixe | ciel / fond uni |
| `far` | 0,25 | décor lointain |
| `near` | 0,6 | décor intermédiaire |
| `main` | 1 | sols, murs, escaliers (même plan que le joueur) |
| *(objets, joueur)* | 1 | |
| `foreground` | 1,3 | premier plan, passe devant le joueur |

Largeur d'une image de couche = `360 + (largeur de la salle − 360) × défilement`.
Pour une salle de 2160 px sur un écran de 390 px logiques : far = 780 px, near = 1440 px, main = 2160 px, foreground = 2700 px. La hauteur suit `GAME_VIEW.height` (≈ 425 px en 16:9, ≈ 582 px sur un iPhone).

## Assets

Aucun asset n'est généré. Le héros vient des animations fournies (marche gauche/droite, repos) : `python tools/assembler-heros.py` les assemble en une planche. Il n'existe pas encore d'animation d'escalade : sur une échelle il garde son animation de marche.

L'interface vient des planches fournies (`assets-source/ui/`) : `python tools/decouper-ui.py` les découpe en 3 densités dans `public/assets/ui/x2|x3|x4/` (le jeu charge celle de l'appareil) et écrit `src/config/UiSizes.generated.ts`. Pour modifier un élément, modifie la planche puis relance le script.

Police : [VT323](https://fonts.google.com/specimen/VT323), licence SIL Open Font License (`public/assets/fonts/VT323-OFL.txt`).
