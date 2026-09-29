# A Timeless Journey — pack vaisseau v1

## Objectif validé

Construire la salle du vaisseau à partir de ces fichiers dans le projet existant :
https://github.com/rambouraxel-del/A-timeless-journey

Mobile PORTRAIT uniquement. Une salle continue de QUATRE largeurs de vue de jeu, sur UN SEUL niveau. La scène occupe 69 % de la hauteur du canvas ; conserver les commandes existantes dans les 31 % restants. Aucun étage, escalier, échelle, atelier, fenêtre sur l'espace, ajout narratif ou quête. Réutiliser le personnage animé déjà intégré. Style futuriste pixel art, métal graphite et blanc cassé, rouge bordeaux, énergie cyan.

## Commencer ici

1. Ouvrir `APERCU.html` : aperçu local avec défilement et activation des couches. Aucune installation nécessaire. Les images doivent rester dans leur dossier relatif.
2. Lire `scene.json` : positions, tailles, profondeurs, points d'ancrage et paramètres de référence.
3. Utiliser uniquement `assets/` dans le jeu. `sources/` conserve les 14 générations originales et la référence approuvée ; ne pas charger ces grandes images en production.
4. `integration/VaisseauAssets.ts` est une aide d'intégration, non exécutée dans le dépôt. L'adapter au préchargement et à la scène du projet.

## Contenu

- 4 panneaux de fond opaques, chacun 720 × 1080 px.
- 4 structures transparentes de même taille, avec sol/plafond/raccords communs.
- 10 objets séparés, détourés et redimensionnés, sans personnage incrusté.
- 4 panneaux de rebord au premier plan.
- 4 panneaux de premier plan proche (les deux centraux sont volontairement transparents).
- 4 modules supplémentaires réutilisables de premier plan. Ne pas les afficher en plus des panneaux déjà assemblés.
- Aperçu complet, aperçu en quatre vues, manifeste et sources.

Total : 30 PNG d'exécution. Les panneaux de premier plan ont les mêmes dimensions que le fond pour simplifier leur alignement. Les PNG transparents utilisent un véritable canal alpha ; un visualiseur peut afficher leur transparence en noir.

## Géométrie et échelle

L'espace de référence du pack est **2880 × 1080 pixels de texture**, découpé en 4 panneaux de 720 × 1080. Le sol praticable est à y=1000. Le personnage n'est pas inclus dans les panneaux.

À la taille nominale, cela correspond à une salle logique de 1440 × 540 et à une vue logique de 360 × 540. Ce ne sont PAS les dimensions obligatoires de tous les téléphones : le projet calcule déjà des dimensions logiques variables.

Pour conserver exactement quatre écrans sur chaque téléphone :

```
sx = GAME_VIEW.width / 720
sy = GAME_VIEW.height / 1080
room.width = 4 * GAME_VIEW.width
room.height = GAME_VIEW.height
groundY = 1000 * sy
```

- Les panneaux complets utilisent `setDisplaySize(GAME_VIEW.width, GAME_VIEW.height)` ; leur position x est `sectionIndex * GAME_VIEW.width`. Cette adaptation peut modifier légèrement les proportions du mur suivant le téléphone.
- Les objets restent proportionnels : taille multipliée par `min(sx, sy)`, position x multipliée par sx, position y multipliée par sy. Leur origine est généralement `(0.5, 1)` : pieds au sol même si le rapport d'écran change.
- Le personnage conserve son échelle existante. Ajuster son point de départ à `x=360*sx, y=groundY`. Si un choix artistique d'échelle devient nécessaire, modifier les équipements de manière cohérente plutôt que d'étirer le héros.
- Le chemin praticable est un seul segment horizontal de `(32*sx, groundY)` à `(2848*sx, groundY)`.
- La hauteur du canevas de commandes est indépendante de la hauteur de texture. Ne pas ajouter 31 % dans chaque image de décor.
- Conserver `pixelArt`, `roundPixels`, le zoom entier `RENDER_SCALE` et le filtrage nearest-neighbor. La mise à l'échelle non entière des textures peut produire des pixels irréguliers ; privilégier une vue logique stable si une grille de pixels parfaitement uniforme devient prioritaire.

## Ordre d'affichage

| Groupe | Profondeur | scrollFactor |
|---|---:|---:|
| Fond mural | 10 | 1 |
| Sol, plafond, renforts structurels | 30 | 1 |
| Équipements | 40 | 1 |
| Personnage existant | 50 | 1 |
| Repères d'interaction | 55 | 1 |
| Rebord de sol | 60 | 1 |
| Angles proches | 70 | 1,025 |

**Ajustement par rapport à la proposition initiale :** les fonds générés contiennent des panneaux et conduits architecturaux. Ils restent donc à scrollFactor=1 pour éviter de faire glisser les raccords. La profondeur vient de la superposition, des ombres et du premier plan léger. Ne pas réappliquer les valeurs génériques 0 / 0,25 / 0,6 / 1 / 1,3 du prototype.

Le premier plan proche ne contient que des angles en partie haute. Le grand montant est livré en option, désactivé : il cachait la porte gauche. Pour un raccord parfaitement fixe aux extrémités, remettre aussi ces angles à 1. Les sprites ne doivent jamais masquer les zones d'interaction essentielles.

## Adaptation au code existant inspecté

Le dépôt contient `src/config/Layout.ts`, `src/world/Layers.ts`, `src/world/RoomDefinition.ts`, `src/scenes/rooms/RoomScene.ts`, `src/scenes/rooms/GreyRoomScene.ts`, `src/data/rooms/greyRoom.ts` et `src/entities/Player.ts`.

- `Layout.ts` possède déjà le partage 69/31. Il définit encore une salle standard de `6 * 360`. Définir la largeur de cette salle par `4 * GAME_VIEW.width`, sans imposer quatre écrans à toutes les futures salles.
- `RoomScene` crée les couches, applique la parallaxe et suit le personnage horizontalement. Fournir une configuration de couches propre au vaisseau ou des conteneurs explicites. Ne pas dessiner simultanément les formes de la salle grise et les nouvelles textures.
- `layerImages` n'accepte qu'une clé par couche : ici, une couche est constituée de quatre panneaux. Étendre la définition de salle ou utiliser une scène de vaisseau qui crée les panneaux. Ne pas tenter de passer un tableau de clés à l'ancien champ.
- Conserver `WalkGraph` et le contrôleur du joueur : un unique segment `floor` suffit. Retirer les escaliers/échelles de la définition de cette salle, pas du moteur général.
- Garder `Player` à la profondeur 50 et les interactions à 40, marqueurs à 55.
- Aligner visuellement portes, console et réacteur avec leurs définitions d'interaction. Les champs `interaction` du manifeste sont des repères ; adapter aux interfaces TypeScript du dépôt. Aucune destination de porte ni scénario n'est prescrit.
- Garder la caméra horizontale amortie, bornée de 0 à `room.width - GAME_VIEW.width`, avec scrollY=0.

## Animation et ambiance

Les fichiers fournis sont **statiques**. Le réacteur est un objet complet, pas une animation à frames ni un assemblage mécanique en anneaux séparés.

Pour donner vie sans redessiner les images : halo cyan discret créé dans le moteur, pulsation lente, petites particules limitées autour du cœur, clignotement subtil de voyants. Les coordonnées FX de `scene.json` sont des points de départ à caler sur l'image. Ne pas faire tourner le sprite entier du réacteur. Une animation mécanique des anneaux ou une ouverture détaillée des portes nécessitera des sprites supplémentaires.

Aucun son n'est inclus. Les éventuels sons devront être ajoutés séparément, avec provenance explicite ; pas de sons inventés présentés comme fournis par ce pack.

## Préparation réalisée / limites

Les planches ont été découpées, les objets ramenés à une échelle commune, les transparences nettoyées et les sols/plafonds reconstruits depuis un module commun. Les changements sont des opérations de découpe, assemblage et redimensionnement ; les sources sont conservées intactes.

Les raccords de panneaux muraux sont masqués par des renforts fixes. La salle finale est un assemblage des nouvelles générations : elle reprend la direction de la référence validée mais n'en est pas une reconstruction pixel pour pixel.

L'aperçu statique et la cohérence des fichiers ont été contrôlés. Le pack n'a pas été intégré ni exécuté dans le jeu ; aucune validation des collisions, interactions ou performances Phaser n'est revendiquée. Le helper TypeScript est fourni pour faciliter cette intégration, pas comme patch déjà validé du dépôt.
