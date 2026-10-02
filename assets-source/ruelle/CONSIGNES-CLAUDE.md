# Intégrer la ruelle du Louvre — A Timeless Journey

La ruelle constitue la troisième scène du début de l'histoire. Le héros arrive par la sortie de secours du musée, à gauche, puis progresse vers le cul-de-sac à droite. L'ambiance est calme, légèrement étrange, ombragée mais clairement de jour. Utiliser les images fournies directement.

## Contenu et dimensions

- Quatre sections successives : `section-01` à `section-04`, de gauche à droite.
- Chaque PNG mesure **1086 × 1448 pixels**, y compris les zones transparentes. Garder le canvas complet : aucun recadrage automatique sur les pixels opaques.
- Panorama assemblé : **4344 × 1448 pixels**. Origine commune en haut à gauche.
- Dans chaque section : `00-arriere-plan.png`, `01-facades.png`, `02-sol.png`, `03-premier-plan.png`.
- `scene-manifest.json` fournit les dimensions, positions et repères. `references/apercu-panorama.png` montre l’assemblage complet en taille réduite ; `composition-validee.png` rappelle le décor approuvé.

| Section | Position X | Position Y |
| --- | ---: | ---: |
| 01 | 0 | 0 |
| 02 | 1086 | 0 |
| 03 | 2172 | 0 |
| 04 | 3258 | 0 |

Les sections ont été régénérées pour apporter davantage de détail. Les bordures internes reprennent la géométrie du panorama source pour stabiliser les raccords. À décalage nul, les quatre couches recomposent exactement le décor assemblé.

## Affichage et ordre des plans

Charger les couches aux mêmes positions, avec une origine `(0, 0)` et une échelle uniforme commune. Ne pas déformer les images pour remplir l'écran. Conserver le rendu pixel art, filtrage nearest-neighbor, alignement aux pixels et absence de flou de profondeur.

Ordre recommandé : arrière-plan (depth 0), façades (10), sol (20), héros/PNJ (30), premier plan (40). Les toits lointains et le ciel sont dans l'arrière-plan ; les fenêtres, tuyaux, portes, végétation contre les murs et poubelles restent dans les façades. Le premier plan correspond aux pavés proches du bord inférieur, sans nouvel objet inventé.

Ne pas afficher le panorama de référence sous les couches : cela doublerait les éléments déplacés par parallaxe.

## Profondeur et parallaxe

La scène n'est pas un décor 3D. Créer la profondeur par une **parallaxe discrète**, sans flou ni déplacement vertical du sol.

- Façades et sol : solidaires du monde, facteur de défilement 1. Toutes les collisions et interactions utilisent ce repère.
- Arrière-plan : déplacer les QUATRE sections comme un seul plan, avec le même petit décalage horizontal global. Exemple : `offsetFond = clamp((cameraCenterX - worldWidth / 2) * 0.01, -12, 12)` en pixels d'asset. Le calcul doit convertir les unités si la scène est mise à l'échelle.
- Premier plan : décalage opposé facultatif, limité à ±4 pixels d'asset, identique sur les quatre sections. Garder ce plan fixe si le mouvement attire trop l'œil.
- Utiliser les mêmes offsets globaux pour tous les morceaux d'une couche ; aucun mouvement individuel des sections.
- Prévoir une marge de rendu aux deux extrémités pour les seuls plans mobiles (réplication de la colonne de bord sur 16 pixels, ou couverture hors caméra). Ne pas déplacer les limites de collision.

L'arrière-plan possède des pixels de support prolongés sous les zones normalement masquées par les façades. Ils permettent ce faible déplacement, mais ne constituent pas une reconstruction complète des bâtiments cachés : **ne pas appliquer une grande parallaxe ou une caméra libre**. Les limites ±12/±4 évitent de dévoiler ces zones.

## Sol, accès et caméra

Les repères suivants sont en pixels des images, avant application de l'échelle : séparation du sol à Y=1168, premier plan à Y=1376, ligne initiale suggérée pour les pieds du héros à Y≈1168. Ajuster légèrement cette ligne à son ancrage réel pour conserver la même présence visuelle que dans le musée.

La sortie de secours est dans la section 01, autour de X=440 global, pied de porte autour de Y=1110. Les coordonnées sont des repères graphiques approximatifs : adapter la zone d'interaction et le point d'apparition au moteur. Le mur de fermeture est dans la section 04 ; placer la limite droite devant ce mur, autour de X=4100, à ajuster selon le volume du héros. Il n'existe aucune sortie vers la droite.

Préserver le téléphone en portrait et le HUD existant (environ 69 % scène / 31 % commandes). Réutiliser les contrôles et le système de transition entre salles. Régler le cadrage et le zoom en conservant les proportions des assets et l'échelle du personnage ; la longueur visible en nombre d'écrans dépend de ce cadrage. Ne pas annoncer neuf écrans sans la mesurer avec la caméra effective.

## Prompt à exécuter

Intègre cette ruelle comme troisième scène du prologue d'A Timeless Journey, après le musée. Exploite les quatre sections et leurs couches selon les positions du manifeste, avec une caméra horizontale en portrait et une parallaxe légère bornée. Relie la sortie de secours située à droite du musée à l'apparition à gauche dans la ruelle. Conserve le style pixel art, les proportions et l'interface existante. Le trajet doit rester accessible jusqu'au cul-de-sac, avec des collisions simples cohérentes avec le sol et le mur final. Réutilise les systèmes existants de déplacement, interaction et dialogue. Préserve les événements narratifs déjà implémentés ; n'invente pas de nouvelle intrigue ni de porte magique intégrée au décor. Si des personnages ou une porte narrative doivent apparaître, utilise leurs assets séparés et leurs événements existants. Prépare l'intégration dans le projet et termine par un compte rendu court des changements.
