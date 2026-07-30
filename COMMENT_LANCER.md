# Lancer StreamDesk

## 1. Démarrer

Double-cliquez sur **`Lancer StreamDesk.bat`** à la racine du dossier.

- Le script vérifie automatiquement la présence de Node.js 22 (version testée pour StreamDesk). Si votre PC a une autre version ou aucune, il télécharge tout seul une version portable dans `.tools\node` — sans toucher à votre installation existante, sans droits administrateur. Cela évite les erreurs de compilation liées à une version de Node trop récente pour certaines dépendances natives.
- Premier lancement : installation des dépendances (`pnpm install`), ce qui peut prendre plusieurs minutes selon votre connexion.
- Lancements suivants : démarrage direct (quelques secondes).
- Une fenêtre Windows Firewall peut apparaître pour Node.js — autorisez l'accès sur **réseau privé** (nécessaire pour que d'autres appareils du réseau puissent se connecter).

Un navigateur s'ouvre automatiquement après quelques secondes sur la page d'administration. Laissez la fenêtre noire (invite de commandes) ouverte : c'est elle qui fait tourner le Serveur, Connect et l'Interface. La fermer (ou Ctrl+C) arrête StreamDesk.

## 2. Accéder à l'application (sur ce PC)

| Vue | Adresse |
|---|---|
| Deck (grille de boutons) | http://localhost:5173 |
| Administration (Vue d'ensemble, Pages, Plugins, Appareils) | http://localhost:5173/admin |
| API du Serveur (technique, pas besoin d'y aller) | http://localhost:8080 |

## 3. Connecter un autre écran (tablette, téléphone, autre PC)

Important : pour que le QR code et le lien affichés dans **Administration → Vue d'ensemble** fonctionnent depuis un autre appareil, vous devez ouvrir l'admin depuis l'**adresse IP locale de ce PC**, pas `localhost`.

1. Trouvez l'IP locale de ce PC : ouvrez une invite de commandes et tapez `ipconfig`, repérez la ligne **Adresse IPv4** (ex. `192.168.1.23`).
2. Sur ce PC, ouvrez `http://192.168.1.23:5173/admin` (remplacez par votre IP) au lieu de `localhost`.
3. Le QR code affiché encode alors cette adresse. Scannez-le depuis l'autre appareil (même réseau Wi-Fi), ou saisissez le lien affiché manuellement.
4. L'écran s'ouvre sur le Deck et se connecte automatiquement au Serveur.
5. Optionnel : sur mobile, proposez d'installer l'application (icône « Installer l'application », ou sur iPhone/iPad : Partager → « Sur l'écran d'accueil »).

## 4. Si quelque chose ne démarre pas

Ce projet vient d'être généré et **n'a encore jamais été compilé ni exécuté réellement** (l'environnement de développement utilisé pour l'écrire n'avait pas d'accès réseau pour installer les paquets). Le premier lancement chez vous est donc le vrai test. Si une erreur apparaît dans la fenêtre noire :

1. Copiez le message d'erreur affiché.
2. Revenez me voir avec ce message — je corrigerai le code en conséquence.

## 5. Au-delà du mode développement

`Lancer StreamDesk.bat` utilise le mode développement (rechargement à chaud, pratique pour tester). Pour une installation plus permanente (démarrage automatique avec Windows, build de production), voir `deployments/windows/README.md`.
