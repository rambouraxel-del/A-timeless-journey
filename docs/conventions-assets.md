# Conventions des graphismes

Ce document decrit comment les graphismes entrent dans le jeu, de la planche
brute au fichier utilise par le moteur. Il vaut aussi bien pour les graphismes
temporaires actuels que pour les graphismes definitifs.

## Le trajet d'une planche

```
assets-source/raw/        planche d'origine, telle que recue, jamais modifiee
        v
assets-source/sliced/     decoupes intermediaires, hors depot, regenerables
        v
public/assets/            fichiers prets a l'emploi, charges par le jeu
```

Conserver la planche d'origine est essentiel : une decoupe ratee ou une regle
de nommage qui change se rattrapent en repartant de la source, sans avoir a
redemander le graphisme.

## Dimensions imposees

| Type                 | Dimensions d'une image | Remarque                                     |
| -------------------- | ---------------------- | -------------------------------------------- |
| Tuile de decor       | 16 x 16                | Base de toute la grille du jeu               |
| Personnage           | 16 x 24                | Plus haut qu'une tuile : la tete depasse     |
| Icone d'objet        | 16 x 16                | Inventaire et coffres                        |
| Icone d'application  | 64 x 64                | Onglet du navigateur, ecran d'accueil        |

Ces dimensions decoulent de la resolution virtuelle definie dans
`src/config/Resolution.ts`. Les changer oblige a reprendre tous les graphismes.

## Nommage des fichiers

`<categorie>_<sujet>[_<variante>].png`, en minuscules, sans accent, mots separes
par des tirets bas.

```
placeholder_terrain.png        planche de tuiles temporaire
antiquite_terrain.png          planche de tuiles de l'epoque antique
heros.png                      planche d'animation du personnage
objets_communs.png             planche d'icones d'objets
```

Rangement dans `public/assets/` :

| Dossier     | Contenu                                     |
| ----------- | ------------------------------------------- |
| `tilesets/` | Planches de tuiles de decor                 |
| `sprites/`  | Planches d'animation (personnages, objets)  |
| `ui/`       | Elements d'interface                        |

## Organisation des planches

**Planche de tuiles** : une seule ligne, les tuiles collees les unes aux autres,
sans marge ni espacement. La position d'une tuile dans la ligne est son
identifiant, celui qui sera ecrit dans les cartes.

> L'ordre des tuiles ne doit jamais changer une fois des cartes creees : la
> tuile numero 4 deviendrait autre chose dans toutes les cartes existantes.
> L'ordre en vigueur est declare dans la constante `TUILE` de
> `src/config/Assets.ts`.

**Planche de personnage** : une ligne par direction, dans l'ordre
`bas`, `gauche`, `droite`, `haut`. Trois images par ligne : repos, pas gauche,
pas droit.

```
      image 0     image 1     image 2
      (repos)   (pas gauche) (pas droit)
bas    [ ]         [ ]         [ ]
gauche [ ]         [ ]         [ ]
droite [ ]         [ ]         [ ]
haut   [ ]         [ ]         [ ]
```

## Declarer un graphisme dans le jeu

Tous les fichiers charges sont declares dans `src/config/Assets.ts`. La scene de
chargement parcourt ce manifeste : ajouter un graphisme ne demande donc jamais
de modifier le code de chargement.

## Remplacer les graphismes temporaires

Les graphismes actuels sont generes par `npm run gen:placeholders`. Ils portent
le prefixe `placeholder_`.

Pour passer aux graphismes definitifs :

1. deposer la planche d'origine dans `assets-source/raw/` ;
2. produire le fichier decoupe aux dimensions imposees dans `public/assets/` ;
3. mettre a jour le chemin dans `src/config/Assets.ts`.

Le reste du code reste inchange : il ne connait que les cles du manifeste,
jamais les noms de fichiers.

## Note sur les graphismes generes par IA

Le pixel art produit par une IA est rarement du vrai pixel art : la grille de
pixels est souvent irreguliere, les contours sont lisses, et la palette derive
d'une image a l'autre. Chaque planche demande donc une passe de nettoyage
(realignement sur la grille, suppression du lissage, harmonisation de la
palette) avant d'entrer dans `public/assets/`.
