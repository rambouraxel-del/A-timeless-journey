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

### Captures d'ecran automatiques

`npm run shot` ouvre le jeu dans un navigateur aux dimensions d'un telephone,
enregistre une capture dans `captures/` et signale les erreurs de console. Le
serveur de developpement doit tourner en parallele.

```bash
npm run shot                                   # 393x852 par defaut
npm run shot -- 768 1024 captures/tablette.png # dimensions et fichier au choix
```

## Publication

Chaque push sur `main` declenche automatiquement la compilation et la
publication sur GitHub Pages, via `.github/workflows/deploy.yml`.

> **A faire une seule fois** dans les reglages du depot :
> `Settings` > `Pages` > `Build and deployment` > `Source` : **GitHub Actions**.
> Sans ce reglage, le deploiement echoue.

Le jeu est ensuite accessible sur
`https://<utilisateur>.github.io/A-timeless-journey/`.

## Organisation du depot

```
src/
  config/      Resolution, zones d'interface, manifeste des assets, config Phaser
  scenes/      Scenes Phaser (demarrage, chargement, jeu)
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

tools/         Scripts de developpement (generation d'assets, captures)
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

Les conventions de nommage et de rangement des graphismes sont decrites dans
[`docs/conventions-assets.md`](docs/conventions-assets.md).
