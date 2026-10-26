# Coach USCM — applis Android et iOS

Application de planification et de suivi des entraînements de tennis jeunes, pour un coach.
Ce dossier contient le projet mobile complet (Capacitor 8). Il produit :

- une **appli Android** : APK à installer directement, et AAB pour Google Play ;
- une **appli iOS** : envoyée sur TestFlight puis sur l'App Store.

L'appli fonctionne **sans connexion** : bibliothèques PDF, lecteur de carnets de match et polices sont embarqués.
Les données restent sur le téléphone du coach.

## Ce que la version mobile ajoute

| Fonction | Détail |
|---|---|
| Stockage durable | Les données sont gardées dans le stockage natif du téléphone, en plus de la mémoire de la page. |
| Partage de fichiers | La fiche PDF d'un joueur et la sauvegarde s'ouvrent dans la feuille de partage (WhatsApp, e-mail, Drive, Fichiers…). |
| Rappels de séances | Notification avant chaque séance et cours collectif des 30 prochains jours (15 min à 2 h avant, au choix dans Réglages). |
| Bouton retour Android | Ferme la fenêtre ouverte, puis revient à l'onglet Aujourd'hui, puis met l'appli en arrière-plan. |
| Icône et écran de démarrage | Balle de tennis sur court vert, version claire et sombre. |
| Encoches et barres système | Mise en page adaptée aux écrans bord à bord (Android 15+, iPhone à encoche). |

## Organisation du dossier

```
src/app.html          L'appli (le même fichier que la version web). C'est le seul fichier à modifier.
src/native.js         Le pont avec le téléphone (stockage, partage, rappels, bouton retour).
scripts/build-web.mjs Prépare le dossier www/ : copie les bibliothèques et les polices, adapte la page.
scripts/draw-assets.py Dessine l'icône et l'écran de démarrage (sources dans assets/).
android/              Projet Android Studio.
ios/                  Projet Xcode.
.github/workflows/    Compilation automatique sur GitHub.
STORE.md              Textes prêts pour les fiches Google Play et App Store.
```

Identifiant de l'appli : `ma.uscm.coach` — nom affiché : **Coach USCM**.

---

## Méthode 1 (recommandée) : compilation automatique sur GitHub

Aucune installation sur votre ordinateur. GitHub compile Android sur Linux et iOS sur Mac, gratuitement pour un dépôt privé dans la limite du quota mensuel.

### 1. Mettre le projet sur GitHub

1. Créez un compte sur github.com si besoin, puis un **nouveau dépôt privé** (par exemple `coach-uscm`).
2. Envoyez le contenu de ce dossier dans le dépôt, sur la branche `main` :
   ```bash
   cd coach-uscm-mobile
   git init -b main
   git add .
   git commit -m "Coach USCM 1.0"
   git remote add origin https://github.com/VOTRE-COMPTE/coach-uscm.git
   git push -u origin main
   ```
   Vous pouvez aussi glisser les fichiers dans la page du dépôt (bouton « Add file » → « Upload files »).

### 2. Récupérer l'APK de test

1. Ouvrez l'onglet **Actions** du dépôt : la compilation « Compiler les applis » démarre seule (5 à 10 min).
2. Ouvrez la compilation terminée, section **Artifacts** : téléchargez `CoachUSCM-1.0.x-android-test`.
3. Dézippez, envoyez `app-debug.apk` sur le téléphone Android et ouvrez-le. Autorisez l'installation depuis cette source si le téléphone le demande.

Cet APK suffit pour tester l'appli et la montrer aux coachs. Il n'est pas accepté par Google Play.

### 3. Signer pour Google Play

Créez **une seule fois** votre clé de signature (Java est fourni avec Android Studio) :

```bash
keytool -genkeypair -v -keystore uscm-release.jks -alias coach-uscm \
  -keyalg RSA -keysize 2048 -validity 10000
```

> Gardez ce fichier `.jks` et ses mots de passe en lieu sûr (deux copies). Sans eux, impossible de publier une mise à jour de l'appli.
> Si vous activez la « signature d'application par Google Play », cette clé devient la clé d'importation : Google peut la réinitialiser en cas de perte.

Convertissez la clé en texte :
- Linux / Mac : `base64 -w0 uscm-release.jks > cle.txt` (sur Mac : `base64 -i uscm-release.jks -o cle.txt`)
- Windows (PowerShell) : `[Convert]::ToBase64String([IO.File]::ReadAllBytes("uscm-release.jks")) > cle.txt`

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**, ajoutez :

| Secret | Valeur |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | le contenu de `cle.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | le mot de passe du fichier |
| `ANDROID_KEY_ALIAS` | `coach-uscm` |
| `ANDROID_KEY_PASSWORD` | le mot de passe de la clé |

Relancez la compilation (Actions → Compiler les applis → **Run workflow**). Un second artifact `…-android-publication` contient alors `app-release.aab` (pour Google Play) et `app-release.apk` (signé).

### 4. Publier sur Google Play

1. Dans la Google Play Console, créez l'application « Coach USCM » (langue par défaut : français).
2. Importez `app-release.aab` d'abord en **test interne** (vous et quelques coachs), puis en production.
3. Remplissez la fiche avec les textes de `STORE.md`, les captures d'écran et l'icône 512 px (`assets/icon-only.png` réduit).
4. Section « Sécurité des données » : l'appli **ne collecte et ne partage aucune donnée** (tout reste sur l'appareil).
5. Public cible : coachs adultes (l'appli n'est pas destinée aux enfants, même si elle parle de joueurs jeunes).

Chaque nouvel envoi sur `main` produit une version au numéro supérieur (1.0.1, 1.0.2…), acceptée directement par Google Play.

### 5. iOS : TestFlight puis App Store

Prérequis : un compte **Apple Developer Program** (99 USD par an).

1. Sur developer.apple.com → *Identifiers*, enregistrez l'identifiant `ma.uscm.coach`.
2. Sur App Store Connect → *Apps* → **+**, créez l'appli « Coach USCM » avec cet identifiant.
3. Sur App Store Connect → *Utilisateurs et accès* → *Intégrations* → **Clés API App Store Connect**, créez une clé avec le rôle **Admin** (nécessaire pour que la signature se fasse toute seule). Téléchargez le fichier `AuthKey_XXXX.p8` (une seule fois possible).
4. Dans GitHub, ajoutez les secrets :

| Secret | Valeur |
|---|---|
| `APPLE_API_KEY_P8` | tout le contenu du fichier `.p8` (lignes BEGIN et END comprises) |
| `APPLE_API_KEY_ID` | l'identifiant de la clé (10 caractères) |
| `APPLE_API_ISSUER_ID` | l'« Issuer ID » affiché au-dessus de la liste des clés |
| `APPLE_TEAM_ID` | votre Team ID (developer.apple.com → Membership) |

5. Relancez la compilation. La version iOS arrive dans **TestFlight** sous 15 à 30 min. Installez l'appli TestFlight sur l'iPhone pour la tester et invitez des coachs par e-mail.
6. Quand tout est bon, soumettez la version à la revue Apple depuis App Store Connect, avec les textes de `STORE.md`.

Sans les secrets Apple, la compilation iOS vérifie seulement que le projet compile.

---

## Méthode 2 : compiler sur votre ordinateur

Prérequis communs : **Node.js 22** ou plus récent.

```bash
cd coach-uscm-mobile
npm ci
```

**Android** (Windows, Mac ou Linux) : installez **Android Studio** (version récente, avec le SDK Android 36), puis :

```bash
npm run android
```

Android Studio s'ouvre : bouton ▶ pour lancer sur un téléphone branché en USB (mode développeur activé) ou un émulateur.
Pour Google Play : *Build → Generate Signed App Bundle / APK*.
Vous pouvez aussi créer `android/keystore.properties` (jamais envoyé sur GitHub) :

```
storeFile=/chemin/vers/uscm-release.jks
storePassword=...
keyAlias=coach-uscm
keyPassword=...
```

**iOS** (Mac uniquement) : installez **Xcode** depuis l'App Store, puis :

```bash
npm run ios
```

Dans Xcode : cible *App* → *Signing & Capabilities* → choisissez votre équipe, puis ▶ sur un iPhone branché, ou *Product → Archive* pour l'App Store.

---

## Mettre à jour l'appli

1. Remplacez `src/app.html` par la nouvelle version du fichier web de l'appli.
2. Envoyez sur GitHub (méthode 1) ou lancez `npm run sync` (méthode 2).

Le script `build-web.mjs` adapte la page automatiquement (bibliothèques locales, polices, marges des écrans). S'il ne reconnaît plus un élément attendu, il s'arrête avec un message clair au lieu de produire une appli incomplète.

Pour changer l'icône : modifiez `scripts/draw-assets.py` (ou remplacez les images de `assets/`), puis `npm run assets`.

## Passer les données de la version web au téléphone

1. Dans la version web : **Réglages → Exporter un fichier de sauvegarde** (ou « Copier la sauvegarde »).
2. Envoyez le fichier sur le téléphone.
3. Dans l'appli : **Réglages → Importer un fichier** (ou collez le texte puis « Restaurer »).

Le même chemin sert à changer de téléphone. Pensez à exporter une sauvegarde régulièrement.

## Versions utilisées

Capacitor 8.5.3 · Android : SDK 36, minimum Android 7 (API 24), Gradle 8.14, Java 21 · iOS : minimum iOS 15, Swift Package Manager · jsPDF 2.5.1 · pdf.js 3.11.174.
