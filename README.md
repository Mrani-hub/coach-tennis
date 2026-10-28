# Coach Tennis — Android et iPhone, en distribution directe

Application de planification et de suivi des entraînements de tennis jeunes, pour un coach.
Application générale, utilisable par n'importe quel club (le nom du club se règle dans l'appli). Pas de Google Play ni d'App Store : l'appli est envoyée directement aux coachs.

| Téléphone | Ce que reçoit le coach | Coût |
|---|---|---|
| **Android** | Un fichier `CoachTennis.apk` (par WhatsApp, e-mail, ou un lien) qu'il installe en le touchant. | Gratuit |
| **iPhone / iPad** | Un lien à ouvrir dans Safari, puis « Sur l'écran d'accueil ». L'appli s'installe avec son icône et marche sans connexion. | Gratuit |

Pourquoi deux méthodes : Apple n'autorise pas l'installation d'un fichier d'appli envoyé directement sur un iPhone, contrairement à Android. Le lien Safari est la seule voie gratuite et sans compte Apple. La version iOS « native » reste possible par TestFlight (voir la fin), avec le compte Apple Developer à 99 USD par an.

Dans les deux cas, l'appli fonctionne hors connexion.

### Deux espaces : coach et joueur

Au premier lancement, l'appli demande **« Je suis coach »** ou **« Je suis joueur »**.

- **Espace coach** : planning, joueurs, écoles, matchs… comme avant. Il peut être protégé par un code (Réglages → Protection de l'espace coach).
- **Espace joueur** : le joueur voit le programme préparé par son coach (séances individuelles et cours collectifs des écoles), ses niveaux par thème, les comptes rendus du coach et ses matchs. Un joueur suivi par deux coachs, ou un parent avec plusieurs enfants, peut suivre plusieurs programmes.

Le lien entre les deux passe par **le Google Drive du coach** : à chaque publication, l'appli dépose dans un dossier « Coach Tennis » un fichier **chiffré** par joueur, et une sauvegarde complète des données du coach. Le joueur reçoit un lien (ou un QR code) contenant la clé de son fichier : lui seul peut le lire, sans compte ni mot de passe. Les données des coachs ne passent par aucun autre serveur.

### Différences entre les deux versions

| | Android (APK) | iPhone (écran d'accueil) |
|---|---|---|
| Toutes les fonctions de l'appli | ✓ | ✓ |
| Hors connexion | ✓ | ✓ (après la première ouverture) |
| Fiche PDF et sauvegarde dans le menu de partage | ✓ | ✓ |
| Rappels avant les séances (notifications) | ✓ | — |
| Bouton retour du téléphone | ✓ | — (pas de bouton retour sur iPhone) |
| Mises à jour | Envoyer le nouvel APK | Automatiques à l'ouverture |
| Espace joueur (lecture du programme) | ✓ | ✓ |
| Coach : publication sur Google Drive | ✓ | Possible, mais la fenêtre de connexion Google peut être bloquée dans l'appli de l'écran d'accueil : publiez alors depuis Safari, un ordinateur ou un téléphone Android |

---

## Mise en place (une seule fois)

### 1. Mettre le projet sur GitHub

1. Créez un compte sur github.com, puis un **nouveau dépôt** nommé `coach-tennis`.
   - **Public (recommandé)** : liens de téléchargement directs pour les coachs et mise en ligne automatique de la version iPhone. Le code est visible, mais il ne contient aucune donnée : les données des coachs restent sur leurs téléphones, et la clé de signature reste secrète.
   - **Privé** : possible aussi, mais l'APK et la version iPhone sont alors à transmettre vous-même (voir plus bas).
2. Envoyez le contenu de ce dossier sur la branche `main` :
   ```bash
   cd coach-tennis-mobile
   git init -b main
   git add .
   git commit -m "Coach Tennis 1.0"
   git remote add origin https://github.com/Mrani-hub/coach-tennis.git
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

L'adresse de la version iPhone sera : `https://mrani-hub.github.io/coach-tennis/`

### 4. Relier l'appli à Google Drive (espace joueur)

À faire une seule fois, avec votre compte Google, sur **console.cloud.google.com** (environ 15 minutes). Sans cette étape, tout fonctionne sauf l'espace joueur et la sauvegarde sur Drive.

1. **Créer un projet** : menu en haut → « Nouveau projet » → nom `Coach Tennis`.
2. **Activer l'API Google Drive** : *API et services → Bibliothèque* → cherchez « Google Drive API » → **Activer**.
3. **Écran de connexion Google** (*Google Auth Platform*). Il ne s'agit pas du Play Store : c'est la fenêtre « Se connecter avec Google » que voit le coach.
   - *Branding* : nom de l'appli `Coach Tennis`, votre e-mail d'assistance. **N'ajoutez pas de logo** (un logo oblige Google à vérifier l'appli).
     Section *Domaine de l'application* :
     - Page d'accueil : `https://mrani-hub.github.io/coach-tennis/`
     - Règles de confidentialité : `https://mrani-hub.github.io/coach-tennis/confidentialite.html`
     - Conditions d'utilisation : laisser vide.
     Section *Domaines autorisés* : `mrani-hub.github.io`. Coordonnées du développeur : votre e-mail. **Enregistrer**.
   - *Audience* : **Publier l'application** (« En production »). L'appli ne demande que l'accès `drive.file` (uniquement les fichiers qu'elle crée elle-même) : Google ne demande pas de vérification pour cet accès.
   - *Accès aux données* : ajoutez le champ d'application `.../auth/drive.file`.
4. **Identifiant Web** : *Clients → Créer un client* → type **Application Web** → nom `Coach Tennis web` → *Origines JavaScript autorisées* : `https://mrani-hub.github.io` → **Créer**. Copiez l'**ID client** (il se termine par `.apps.googleusercontent.com`).
5. **Identifiant Android** : *Clients → Créer un client* → type **Android** :
   - Nom du package : `ma.coachtennis.app`
   - Empreinte SHA-1 : `F3:A6:5C:6C:B5:FC:04:EB:20:FE:B3:7F:EC:F5:32:05:CA:9F:9F:4D`
     (celle de votre clé `uscm-release.jks` ; l'APK de test non signé n'est pas reconnu)
6. **Clé d'API** (lecture des programmes par les joueurs) : *API et services → Identifiants → Créer des identifiants → Clé API*. Dans « Restrictions relatives aux API », choisissez **Google Drive API** uniquement. Copiez la clé.
7. Dans le dépôt, modifiez le fichier **`config-google.json`** (bouton crayon sur GitHub) :
   ```json
   {
     "googleClientId": "1234…apps.googleusercontent.com",
     "googleApiKey": "AIza…",
     "playerUrl": ""
   }
   ```
   Laissez `playerUrl` vide : l'adresse GitHub Pages du dépôt est utilisée automatiquement pour les liens envoyés aux joueurs. Si vous hébergez la version iPhone ailleurs (Netlify…), mettez son adresse ici et ajoutez-la aussi dans les *Origines JavaScript autorisées* de l'étape 4.

Ces identifiants ne sont pas secrets : ils permettent seulement à l'appli de demander l'autorisation au coach. Chaque coach se connecte avec **son propre compte Google** et les fichiers vont sur **son** Drive.

### 5. Lancer la compilation

Onglet **Actions** → « Compiler les applis » → **Run workflow** (elle se lance aussi à chaque envoi sur `main`). Comptez 5 à 10 minutes. Le résumé de la compilation indique où trouver chaque fichier.

---

## Envoyer l'appli aux coachs

### Android

- **Dépôt public** : envoyez ce lien, qui donne toujours la dernière version :
  `https://github.com/Mrani-hub/coach-tennis/releases/latest/download/CoachTennis.apk`
- **Dépôt privé** : téléchargez l'artifact `CoachTennis-1.0.x-Android` dans la compilation terminée, dézippez-le et envoyez `CoachTennis.apk` par WhatsApp ou e-mail.

### iPhone

- **Dépôt public** : envoyez le lien `https://mrani-hub.github.io/coach-tennis/`.
- **Dépôt privé** : téléchargez l'artifact `CoachTennis-1.0.x-iPhone-web`, dézippez-le, puis glissez le dossier sur **app.netlify.com/drop** (gratuit). Netlify donne un lien en `https://….netlify.app` à envoyer aux coachs. Pour une mise à jour, glissez le nouveau dossier sur le même site Netlify.

Le texte d'installation à envoyer aux coachs est prêt dans `INSTALLATION-COACHS.md`.

## Donner l'accès à un joueur

1. Espace coach → fiche du joueur → **Activer l'espace joueur**. La première fois, l'appli demande de se connecter à Google et d'autoriser l'accès à Drive.
2. Le lien d'accès et le QR code apparaissent dans la fiche. Envoyez le lien (bouton WhatsApp ou Copier), ou faites scanner le QR code.
3. Le joueur ouvre le lien : sur iPhone comme sur Android, son programme s'affiche dans le navigateur et il peut l'ajouter à son écran d'accueil. S'il a l'APK, il peut aussi coller le lien dans **Réglages → Ajouter un programme**.
4. Après vos modifications, touchez **Publier** (bandeau sur l'écran Aujourd'hui, ou Réglages). Tant que vous restez connecté à Google (50 minutes), chaque modification est publiée automatiquement.
5. **Retirer l'accès** dans la fiche supprime le fichier du Drive : l'ancien lien ne fonctionne plus. Une nouvelle activation crée un nouveau lien.

Le message à envoyer aux joueurs est prêt dans `INSTALLATION-JOUEURS.md`.

**Données de jeunes joueurs** : les fichiers sont chiffrés et seuls les détenteurs du lien peuvent les lire. Informez les parents et recueillez leur accord avant d'activer l'espace d'un joueur mineur. Le numéro de téléphone des parents et vos notes privées ne sont jamais publiés.

**Changer d'appareil (coach)** : sur le nouvel appareil, Réglages → **Restaurer depuis Google Drive**, avec le même compte Google.

---

## Espace joueur : connexion, notifications, confirmations

**Connexion.** Le joueur ouvre le lien (ou scanne le QR code) envoyé par le coach : c'est son code d'invitation. Il choisit ensuite un **code PIN** de 4 à 6 chiffres, demandé à chaque ouverture et après 5 minutes en arrière-plan. Après 5 erreurs, l'appli impose une pause qui s'allonge. Code oublié : « Code oublié ? » puis coller à nouveau le lien du coach. Plusieurs joueurs peuvent partager un téléphone (chacun son PIN).

**Notification de nouvelle séance.** À chaque publication, l'appli du coach compare le programme avec la publication précédente et écrit sur le fichier Drive du joueur un court marqueur (« Nouvelle séance : lun. 2 nov. à 16:00 »).
- **APK Android** : l'appli vérifie ce marqueur en arrière-plan environ toutes les 15 à 30 minutes et affiche une notification. Sur certains téléphones (Xiaomi, Huawei, Samsung…), il faut autoriser l'appli à fonctionner en arrière-plan (voir dontkillmyapp.com).
- **iPhone (écran d'accueil)** : sans serveur de notifications, la nouveauté s'affiche à l'ouverture de l'appli (bandeau « Nouveau » et rubrique « À confirmer »).

**Confirmation.** Dans « À confirmer », le joueur répond **Je serai présent** ou **Je ne peux pas** (avec un message facultatif), pour ses séances individuelles et ses cours collectifs des 7 prochains jours. Le coach voit les réponses dans l'écran Aujourd'hui, sur chaque créneau du planning et dans la fiche de séance ou de cours.

Deux façons d'acheminer les réponses :
1. **Relais Google (recommandé)** : un petit script Google, installé une fois sur votre compte (gratuit, sans carte bancaire). Les réponses sont rangées dans une feuille « Coach Tennis – confirmations des joueurs » de votre Drive. Elles ne contiennent ni nom ni téléphone : seulement l'identifiant du fichier joueur, le créneau et la réponse.
2. **WhatsApp (par défaut tant que le relais n'est pas installé)** : la réponse s'ouvre dans WhatsApp, adressée au numéro indiqué par le coach dans ses Réglages.

### Installer le relais Google (5 minutes, une seule fois)

1. Ouvrez **script.google.com** avec votre compte Google → **Nouveau projet**. Renommez-le `Coach Tennis – relais`.
2. Effacez le contenu de l'éditeur et collez celui du fichier **`relais/Code.gs`** de ce dépôt. Cliquez sur 💾 **Enregistrer**.
3. **Déployer → Nouveau déploiement** → roue dentée → **Application Web** :
   - Description : `Relais confirmations`
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. **Déployer** → **Autoriser l'accès** → choisissez votre compte. Si Google affiche « Google n'a pas validé cette application » : **Paramètres avancés → Accéder à Coach Tennis – relais (non sécurisé)** → **Autoriser**. C'est votre propre script, sur votre propre compte.
5. Copiez l'**URL de l'application Web** (elle se termine par `/exec`) et collez-la dans `relaisUrl` du fichier `config-google.json`.

Un seul relais suffit pour tous les coachs qui utilisent cette version de l'appli. Pour le modifier plus tard : *Déployer → Gérer les déploiements → ✏️ → Nouvelle version* (l'URL reste la même).

## Mettre à jour l'appli

1. Remplacez `src/app.html` par la nouvelle version du fichier de l'appli.
2. Envoyez-le sur GitHub. La compilation repart et le numéro de version augmente (1.0.1, 1.0.2…).
3. **Android** : rien à envoyer. L'appli télécharge discrètement la nouvelle version (quelques Mo, depuis GitHub Pages) et propose « Mettre à jour » : elle redémarre en quelques secondes, sans réinstaller l'APK, données conservées. Une version téléchargée s'installe aussi d'elle-même au lancement suivant. Si l'installation échoue, l'appli revient seule à la version précédente et propose l'APK.
   *Exception* : si la partie native change (nouveau plugin, autorisation Android…), augmentez le nombre dans `natif-min.txt` (mettez le numéro de la compilation qui arrive). Les appareils plus anciens proposeront alors de télécharger l'APK, une seule fois.
   **iPhone** : rien à faire. L'appli se met à jour à la prochaine ouverture avec du réseau et affiche « Coach Tennis a été mis à jour ».

---

## Organisation du dossier

```
src/app.html            L'appli (le même fichier que la version web). C'est le seul fichier à modifier.
src/native.js           Le pont avec le téléphone Android/iOS (stockage, partage, rappels, bouton retour, connexion Google).
natif-min.txt           Numéro de compilation Android minimal pour la mise à jour dans l'appli (voir « Mettre à jour l'appli »).
config-google.json        Identifiants Google pour l'espace joueur (voir « Relier l'appli à Google Drive »).
scripts/build-web.mjs   Prépare l'appli : www/ pour Android/iOS natif, pwa/ pour l'iPhone via Safari (--pwa).
scripts/draw-assets.py  Dessine l'icône et l'écran de démarrage (sources dans assets/).
android/                Projet Android Studio.
ios/                    Projet Xcode (pour l'option TestFlight).
.github/workflows/      Compilation automatique.
INSTALLATION-COACHS.md  Message d'installation à envoyer aux coachs.
INSTALLATION-JOUEURS.md Message à envoyer aux joueurs avec leur lien.
```

Identifiant de l'appli : `ma.coachtennis.app` — nom affiché : **Coach Tennis**.

## Compiler l'APK sur votre ordinateur (sans GitHub)

Prérequis : **Node.js 22** et **Android Studio** récent (SDK Android 36).

1. Copiez `uscm-release.jks` dans le dossier `android/`, puis créez `android/keystore.properties` (ce fichier n'est jamais envoyé sur GitHub) :
   ```
   storeFile=uscm-release.jks
   storePassword=LE_MOT_DE_PASSE
   keyAlias=coach-tennis
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
2. developer.apple.com → *Identifiers* : enregistrez `ma.coachtennis.app`. App Store Connect → *Apps* → **+** : créez « Coach Tennis ».
3. App Store Connect → *Utilisateurs et accès* → *Intégrations* → **Clés API** : créez une clé au rôle **Admin**, téléchargez le fichier `.p8`.
4. Secrets GitHub : `APPLE_API_KEY_P8` (contenu du fichier `.p8`), `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_TEAM_ID`. Variable : `IOS_TESTFLIGHT` = `true`.
5. La compilation envoie alors chaque version sur TestFlight. Pour les testeurs externes, Apple fait une vérification rapide de la première version.

## Versions utilisées

Capacitor 8.5.3 · Android : SDK 36, minimum Android 7 (API 24), Gradle 8.14, Java 21 · iOS natif : minimum iOS 15 · iPhone via Safari : iOS 16.4 ou plus récent conseillé · jsPDF 2.5.1 · pdf.js 3.11.174.
