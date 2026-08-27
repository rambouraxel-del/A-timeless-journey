# A Timeless Journey

Jeu d'exploration 2D pixel art a travers le temps, concu pour telephone en mode
portrait. Le joueur possede un vaisseau temporel qui lui sert de base : il en
sort pour explorer une epoque, resout des mysteres, ramene des objets, et
debloque peu a peu de nouvelles pieces dans son vaisseau.

**Version actuelle : v0.1 (en construction)**

---

## Demarrer

```bash
npm install          # une seule fois
npm run dev          # http://localhost:5173
```

Le serveur de developpement ecoute aussi sur le reseau local : l'adresse
`Network:` affichee au demarrage permet d'ouvrir le jeu directement dans le
navigateur du telephone, sur le meme wifi.

## Commandes

| Commande                   | Role                                                    |
| -------------------------- | ------------------------------------------------------- |
| `npm run dev`              | Serveur de developpement, rechargement a chaud           |
| `npm run build`            | Compilation pour la production dans `dist/`              |
| `npm run preview`          | Sert la version compilee, comme sur GitHub Pages         |
| `npm run typecheck`        | Verification des types sans compiler                     |
| `npm run gen:placeholders` | Regenere les graphismes temporaires                      |
| `npm run shot`             | Capture d'ecran du jeu dans un navigateur (voir plus bas)|
| `npm run test:controles`   | Teste le joystick et les collisions dans un navigateur   |

### Captures d'ecran automatiques

`npm run shot` ouvre le jeu dans un navigateur aux dimensions d'un telephone,
enregistre une capture dans `captures/` et signale les erreurs de console. Le
serveur de developpement doit tourner en parallele.

```bash
npm run shot                                   # 393x852 par defaut
npm run shot -- 768 1024 captures/tablette.png # dimensions et fichier au choix
```

### Test des commandes tactiles

Un joystick ne se verifie pas sur une capture figee. `npm run test:controles`
pilote la surface tactile du navigateur comme le ferait un pouce, puis lit la
position du personnage dans le jeu pour verifier qu'il part bien dans la
direction demandee et qu'il s'arrete contre les obstacles. Le serveur de
developpement doit tourner en parallele.

### Adresses utiles

| Adresse             | Effet                                                   |
| ------------------- | ------------------------------------------------------- |
| `/`                 | Le jeu                                                  |
| `/?debug=1`         | Affiche les cadres de collision par dessus le decor      |
| `/?scene=diagnostic`| Ecran de controle de la mise en page portrait            |

## Publication

Chaque push sur `main` declenche automatiquement la compilation et la
publication sur GitHub Pages, via `.github/workflows/deploy.yml`.

> **Reglage indispensable**, dans les reglages du depot :
> `Settings` > `Pages` > `Build and deployment` > `Source` : **GitHub Actions**.
>
> Regle sur `Deploy from a branch`, GitHub publie la racine du depot au lieu du
> resultat de la compilation. La page s'ouvre alors sans style et sans jeu :
> elle sert le `index.html` source, qui pointe vers du TypeScript non compile.
> Ce reglage est le premier endroit a verifier si le jeu ne demarre pas en
> ligne, d'autant que le workflow de compilation, lui, reste au vert.

Le jeu est ensuite accessible sur
`https://<utilisateur>.github.io/A-timeless-journey/`.

## Organisation du depot

```
src/
  config/      Resolution, zones d'interface, manifeste des assets, config Phaser
  scenes/      Scenes Phaser (demarrage, chargement, jeu)
  entities/    Objets du monde animes par le jeu (le heros...)
  systems/     Systemes transverses (animations, inventaire, sauvegarde...)
  ui/          Composants d'interface (joystick, barre d'etat...)
  data/        Donnees de contenu (objets, cartes, dialogues)
  styles/      Feuille de style de la page qui heberge le jeu

public/
  assets/      Graphismes prets a l'emploi, servis tels quels au navigateur
  icone.png    Icone d'onglet et d'ecran d'accueil

assets-source/
  raw/         Planches d'origine, jamais modifiees
  sliced/      Decoupes intermediaires (regenerables, hors depot)

tools/         Scripts de developpement (generation d'assets, decoupe, tests)
docs/          Conventions et notes de conception
```

## Choix techniques

- **Phaser 3 + TypeScript + Vite.** Le jeu est une page web, empaquetee plus
  tard en application mobile avec Capacitor. Il se teste donc dans n'importe
  quel navigateur, sur ordinateur comme sur telephone.
- **Resolution virtuelle a largeur fixe.** 20 tuiles de 16 pixels de large sur
  tous les appareils, hauteur calculee depuis le format reel de l'ecran. Voir
  `src/config/Resolution.ts`.
- **Pas de monde ouvert.** Chaque epoque est une grille de petites cartes
  reliees par leurs bords, a la maniere de Dofus ou Albion Online. La carte du
  joueur se devoile au fil des visites.
- **Le vaisseau est un monde comme les autres**, simplement persistant et hors
  du temps.
- **Joystick flottant.** Il apparait la ou le pouce se pose dans la moitie
  gauche de l'ecran, au lieu d'attendre le doigt a un emplacement fixe.

Le decoupage des planches de personnage utilise Python et Pillow, installes a
part : voir [`docs/conventions-assets.md`](docs/conventions-assets.md). Le jeu
lui-meme et la generation des graphismes temporaires ne demandent que Node.

Les conventions de nommage et de rangement des graphismes sont decrites dans
[`docs/conventions-assets.md`](docs/conventions-assets.md).
