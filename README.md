# Coach USCM — Android et iPhone, en distribution directe

Application de planification et de suivi des entraînements de tennis jeunes, pour un coach.
Pas de Google Play ni d'App Store : l'appli est envoyée directement aux coachs.

| Téléphone | Ce que reçoit le coach | Coût |
|---|---|---|
| **Android** | Un fichier `CoachUSCM.apk` (par WhatsApp, e-mail, ou un lien) qu'il installe en le touchant. | Gratuit |
| **iPhone / iPad** | Un lien à ouvrir dans Safari, puis « Sur l'écran d'accueil ». L'appli s'installe avec son icône et marche sans connexion. | Gratuit |

Pourquoi deux méthodes : Apple n'autorise pas l'installation d'un fichier d'appli envoyé directement sur un iPhone, contrairement à Android. Le lien Safari est la seule voie gratuite et sans compte Apple. La version iOS « native » reste possible par TestFlight (voir la fin), avec le compte Apple Developer à 99 USD par an.

Dans les deux cas, les données restent sur le téléphone du coach et l'appli fonctionne hors connexion.

### Différences entre les deux versions

| | Android (APK) | iPhone (écran d'accueil) |
|---|---|---|
| Toutes les fonctions de l'appli | ✓ | ✓ |
| Hors connexion | ✓ | ✓ (après la première ouverture) |
| Fiche PDF et sauvegarde dans le menu de partage | ✓ | ✓ |
| Rappels avant les séances (notifications) | ✓ | — |
| Bouton retour du téléphone | ✓ | — (pas de bouton retour sur iPhone) |
| Mises à jour | Envoyer le nouvel APK | Automatiques à l'ouverture |

---

## Mise en place (une seule fois)

### 1. Mettre le projet sur GitHub

1. Créez un compte sur github.com, puis un **nouveau dépôt** nommé `coach-uscm`.
   - **Public (recommandé)** : liens de téléchargement directs pour les coachs et mise en ligne automatique de la version iPhone. Le code est visible, mais il ne contient aucune donnée : les données des coachs restent sur leurs téléphones, et la clé de signature reste secrète.
   - **Privé** : possible aussi, mais l'APK et la version iPhone sont alors à transmettre vous-même (voir plus bas).
2. Envoyez le contenu de ce dossier sur la branche `main` :
   ```bash
   cd coach-uscm-mobile
   git init -b main
   git add .
   git commit -m "Coach USCM 1.0"
   git remote add origin https://github.com/VOTRE-COMPTE/coach-uscm.git
   git push -u origin main
   ```
   Ou, sans ligne de commande : page du dépôt → « Add file » → « Upload files », glissez tous les fichiers et dossiers.

### 2. Ajouter la clé de signature Android

La clé `uscm-release.jks` et la fiche `CLE-ANDROID-A-GARDER.txt` vous ont été fournies **à part**. Elles garantissent que chaque nouvel APK s'installe par-dessus l'ancien **sans perte de données** chez les coachs.

Dépôt GitHub → **Settings → Secrets and variables → Actions → New repository secret**, créez les 4 secrets indiqués dans la fiche :
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

> Gardez la clé et la fiche en deux exemplaires (clé USB + coffre en ligne). Si elles sont perdues, les coachs devront désinstaller l'appli pour installer une nouvelle version, et perdront leurs données.

### 3. Mettre en ligne la version iPhone (dépôt public)

1. **Settings → Pages** : dans « Build and deployment », Source = **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → onglet Variables → New repository variable** :
   nom `PUBLIER_PAGES`, valeur `true`.

L'adresse de la version iPhone sera : `https://VOTRE-COMPTE.github.io/coach-uscm/`

### 4. Lancer la compilation

Onglet **Actions** → « Compiler les applis » → **Run workflow** (elle se lance aussi à chaque envoi sur `main`). Comptez 5 à 10 minutes. Le résumé de la compilation indique où trouver chaque fichier.

---

## Envoyer l'appli aux coachs

### Android

- **Dépôt public** : envoyez ce lien, qui donne toujours la dernière version :
  `https://github.com/VOTRE-COMPTE/coach-uscm/releases/latest/download/CoachUSCM.apk`
- **Dépôt privé** : téléchargez l'artifact `CoachUSCM-1.0.x-Android` dans la compilation terminée, dézippez-le et envoyez `CoachUSCM.apk` par WhatsApp ou e-mail.

### iPhone

- **Dépôt public** : envoyez le lien `https://VOTRE-COMPTE.github.io/coach-uscm/`.
- **Dépôt privé** : téléchargez l'artifact `CoachUSCM-1.0.x-iPhone-web`, dézippez-le, puis glissez le dossier sur **app.netlify.com/drop** (gratuit). Netlify donne un lien en `https://….netlify.app` à envoyer aux coachs. Pour une mise à jour, glissez le nouveau dossier sur le même site Netlify.

Le texte d'installation à envoyer aux coachs est prêt dans `INSTALLATION-COACHS.md`.

---

## Mettre à jour l'appli

1. Remplacez `src/app.html` par la nouvelle version du fichier de l'appli.
2. Envoyez-le sur GitHub. La compilation repart et le numéro de version augmente (1.0.1, 1.0.2…).
3. **Android** : envoyez le nouvel APK (le lien « latest » pointe déjà dessus). Les coachs l'installent par-dessus, leurs données sont gardées.
   **iPhone** : rien à faire. L'appli se met à jour à la prochaine ouverture avec du réseau et affiche « Coach USCM a été mis à jour ».

---

## Organisation du dossier

```
src/app.html            L'appli (le même fichier que la version web). C'est le seul fichier à modifier.
src/native.js           Le pont avec le téléphone Android/iOS (stockage, partage, rappels, bouton retour).
scripts/build-web.mjs   Prépare l'appli : www/ pour Android/iOS natif, pwa/ pour l'iPhone via Safari (--pwa).
scripts/draw-assets.py  Dessine l'icône et l'écran de démarrage (sources dans assets/).
android/                Projet Android Studio.
ios/                    Projet Xcode (pour l'option TestFlight).
.github/workflows/      Compilation automatique.
INSTALLATION-COACHS.md  Message d'installation à envoyer aux coachs.
```

Identifiant de l'appli : `ma.uscm.coach` — nom affiché : **Coach USCM**.

## Compiler l'APK sur votre ordinateur (sans GitHub)

Prérequis : **Node.js 22** et **Android Studio** récent (SDK Android 36).

1. Copiez `uscm-release.jks` dans le dossier `android/`, puis créez `android/keystore.properties` (ce fichier n'est jamais envoyé sur GitHub) :
   ```
   storeFile=uscm-release.jks
   storePassword=LE_MOT_DE_PASSE
   keyAlias=coach-uscm
   keyPassword=LE_MOT_DE_PASSE
   ```
2. Puis :
   ```bash
   npm ci
   npm run sync
   cd android
   ./gradlew assembleRelease        (Windows : gradlew.bat assembleRelease)
   ```
3. L'APK est dans `android/app/build/outputs/apk/release/app-release.apk`.

Pour la version iPhone : `npm run build:pwa`, puis hébergez le dossier `pwa/` (Netlify Drop, GitHub Pages…). Elle doit être servie en `https://` pour fonctionner hors ligne.

## Option : vraie appli iOS par TestFlight

Si un jour vous voulez les rappels de séances sur iPhone, il faut l'appli iOS native. Sans App Store, la seule voie est **TestFlight** : jusqu'à 10 000 testeurs invités par e-mail ou par lien public. Chaque version reste valable 90 jours, puis il faut en envoyer une nouvelle.

1. Compte **Apple Developer Program** (99 USD par an).
2. developer.apple.com → *Identifiers* : enregistrez `ma.uscm.coach`. App Store Connect → *Apps* → **+** : créez « Coach USCM ».
3. App Store Connect → *Utilisateurs et accès* → *Intégrations* → **Clés API** : créez une clé au rôle **Admin**, téléchargez le fichier `.p8`.
4. Secrets GitHub : `APPLE_API_KEY_P8` (contenu du fichier `.p8`), `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_TEAM_ID`. Variable : `IOS_TESTFLIGHT` = `true`.
5. La compilation envoie alors chaque version sur TestFlight. Pour les testeurs externes, Apple fait une vérification rapide de la première version.

## Versions utilisées

Capacitor 8.5.3 · Android : SDK 36, minimum Android 7 (API 24), Gradle 8.14, Java 21 · iOS natif : minimum iOS 15 · iPhone via Safari : iOS 16.4 ou plus récent conseillé · jsPDF 2.5.1 · pdf.js 3.11.174.
