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

| Type                 | Dimensions d'une image | Remarque                                       |
| -------------------- | ---------------------- | ---------------------------------------------- |
| Tuile de decor       | 16 x 16                | Base de toute la grille du jeu                 |
| Personnage           | 32 x 48                | Deux tuiles de large, trois de haut            |
| Icone d'objet        | 16 x 16                | Inventaire et coffres                          |
| Icone d'application  | 64 x 64                | Onglet du navigateur, ecran d'accueil          |

Un personnage occupe deux tuiles de large a l'ecran, mais son **cadre de
collision ne couvre que ses pieds** : une seule tuile, definie par la constante
`COLLISION_HEROS` de `src/config/Assets.ts`. Sans cela, il ne pourrait pas
emprunter un passage d'une tuile de large, alors que le decor en est fait.

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

**Planche de personnage produite** : une ligne par direction, dans l'ordre
`bas`, `gauche`, `droite`, `haut`, quatre images par ligne. La premiere image de
chaque ligne sert aussi de pose de repos : c'est celle ou les pieds sont le plus
rapproches.

```
       image 0    image 1   image 2   image 3
       (repos)
bas     [ ]        [ ]       [ ]       [ ]
gauche  [ ]        [ ]       [ ]       [ ]
droite  [ ]        [ ]       [ ]       [ ]
haut    [ ]        [ ]       [ ]       [ ]
```

Cet ordre est partage par trois endroits qui doivent rester accordes : la liste
`RANGEES` de `tools/decouper-planche.py`, la constante `DIRECTIONS` de
`src/systems/Animations.ts`, et la planche elle-meme.

Les pieds du personnage sont poses au bas de son image. Son point d'ancrage dans
le jeu est donc le milieu du bord inferieur : le positionner revient a dire ou il
se tient, sans avoir a compenser la hauteur de son image.

## Decouper une planche de personnage

Une planche fournie par une IA n'est jamais alignee sur une grille : les sujets
sont poses un peu n'importe ou, avec des tailles et des espacements irreguliers.
Le script `tools/decouper-planche.py` ne suppose donc aucune grille. Il repere
chaque sujet par ses pixels opaques, les regroupe en rangees, puis recompose une
planche propre a pas fixe.

```bash
pip install pillow numpy       # une seule fois
python3 tools/decouper-planche.py
```

Le decoupage n'est a relancer que si la planche source change : son resultat est
versionne dans `public/assets/`.

Trois precautions y sont prises, qui valent pour toute planche a venir :

- **Une echelle unique pour toute la planche.** Reduire chaque rangee a sa propre
  hauteur cible ferait grandir ou retrecir le personnage quand il tourne. Les
  rangees retenues pour la premiere planche mesuraient toutes 102 a 103 pixels ;
  les rangees de pose fixe, hautes de 110 a 115 pixels, ont ete ecartees pour
  cette raison.
- **Un ancrage sur le haut du corps.** Centrer chaque image sur son cadre
  englobant ferait glisser le personnage lateralement pendant la marche, au gre
  de l'ecartement des bras et des jambes. Seuls la tete et le buste servent de
  repere, car ils bougent peu.
- **Une reduction en couleurs premultipliees.** Les pixels transparents d'une
  planche ne sont pas neutres : ils portent la couleur du fond d'origine.
  Reduits tels quels, ils deversent cette couleur sur le contour du personnage,
  qui se retrouve cercle d'un lisere sale.

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
d'une image a l'autre. Chaque planche demande donc une passe de nettoyage avant
d'entrer dans `public/assets/`.

Une planche contient aussi souvent plus que le necessaire, et pas toujours ce
qu'elle semble contenir. Sur la premiere planche de heros, neuf rangees ont ete
detectees pour quatre effectivement utilisees : deux rangees de profil se
ressemblaient au point de paraitre identiques, alors qu'elles regardaient dans
des sens opposes, et trois rangees de face faisaient double emploi. Mieux vaut
mesurer une planche que la lire a l'oeil : c'est en comparant la position de la
peau et des cheveux que l'orientation reelle de chaque rangee a ete etablie, et
en mesurant l'ecartement des pieds que la meilleure rangee de marche a ete
choisie.

Les rangees inutilisees restent disponibles dans la planche d'origine, sous
`assets-source/raw/`. La premiere planche en conserve : une rotation du
personnage sur huit positions, et des poses fixes de face et de dos.
