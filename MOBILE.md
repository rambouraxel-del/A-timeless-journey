# Version mobile (Capacitor) — prototype

Le jeu (Phaser + TypeScript + Vite) est embarqué tel quel dans une application iOS et Android via Capacitor 8.
La version web (GitHub Pages) n'est pas modifiée.

## Ce qui a été analysé

| Sujet | Constat |
| --- | --- |
| Build web | `npm run build` → `dist/` (base `/A-timeless-journey/`, GitHub Pages) |
| Build mobile | `npm run build:mobile` → `dist/` (base `./`, chemins relatifs) ; `npm run cap:sync` = build + copie dans `ios/` et `android/` |
| Ressources distantes | Aucune : images, police VT323, données de salle sont dans `public/assets/` (≈ 13 Mo), aucune requête externe |
| Hors ligne | Fonctionne, tout est embarqué |
| Audio | Aucun son dans le projet pour l'instant (rien à traiter) |
| Sauvegardes | `localStorage` (3 emplacements + réglages). Voir « Sauvegardes » ci-dessous |
| Orientation | Portrait verrouillé (Info.plist et AndroidManifest) |

## Sauvegardes

- Elles restent en `localStorage`, aucun changement de format : la migration de l'ancienne sauvegarde unique continue de fonctionner.
- Dans l'app, le jeu tourne sur une origine différente de GitHub Pages (`capacitor://localhost` sur iOS, `https://localhost` sur Android) : **les sauvegardes du navigateur ne sont pas visibles dans l'app**, et inversement. Ce sont deux espaces séparés.
- iOS/Android peuvent, très rarement, vider le stockage web d'une app en cas de manque d'espace. Avant une vraie publication, prévoir le stockage natif (plugin `@capacitor/preferences`).

## Identifiant provisoire

`com.atimelessjourney.game` (fichier `capacitor.config.ts`). À choisir définitivement **avant** toute publication : il ne pourra plus changer. Pour le modifier aujourd'hui : changer `appId`, puis dans Xcode (Signing) et dans `android/app/build.gradle` (`applicationId`, `namespace`).

## Mettre à jour l'app après une modification du jeu

```bash
npm run cap:sync
```

## Lancer sur iPhone (Xcode) — pas à pas

Prérequis : un Mac avec **Xcode récent** (Capacitor 8 utilise Swift Package Manager, pas besoin de CocoaPods), **Node 22+**, un câble USB, un iPhone (iOS 15 ou plus). Un compte Apple gratuit suffit pour tester sur son propre iPhone (l'app expire au bout de 7 jours ; on la réinstalle).

1. **Installer les outils** : Xcode depuis l'App Store (l'ouvrir une fois et accepter la licence), Node depuis nodejs.org (version LTS 22 ou plus).
2. **Récupérer le projet** : dans le Terminal :
   ```bash
   git clone https://github.com/rambouraxel-del/a-timeless-journey.git
   cd a-timeless-journey
   git checkout capacitor-mobile
   npm install
   npm run cap:sync
   ```
3. **Ouvrir dans Xcode** : `npx cap open ios` (ou double-clic sur `ios/App/App.xcodeproj`). Attendre la fin de « Resolving packages » en haut.
4. **Compte Apple** : Xcode > Réglages > Comptes > « + » > Apple ID.
5. **Signature** : cliquer sur le projet **App** (colonne de gauche) > cible **App** > onglet **Signing & Capabilities** > cocher « Automatically manage signing » > **Team** : choisir votre compte (Personal Team). Si Xcode dit que l'identifiant est déjà pris, changer `com.atimelessjourney.game` en quelque chose d'unique (ex. `com.votrenom.atimelessjourney`).
6. **Préparer l'iPhone** : le brancher, le déverrouiller, toucher « Faire confiance ». Sur l'iPhone : Réglages > Confidentialité et sécurité > **Mode développeur** > activer, puis redémarrer l'iPhone.
7. **Lancer** : en haut de Xcode, choisir votre iPhone dans la liste des appareils, puis bouton ▶ (Run).
8. **Première ouverture** : si l'iPhone refuse l'app, aller dans Réglages > Général > **VPN et gestion de l'appareil** > votre compte > « Faire confiance ».

Si le jeu ne se lance pas : rebrancher, Product > Clean Build Folder dans Xcode, relancer ▶. Pour tester d'abord sans iPhone : choisir un simulateur iPhone dans la liste.

## Android (plus tard)

`npx cap open android` ouvre Android Studio (JDK 21 fourni avec lui) ; brancher un téléphone en mode développeur puis ▶.
