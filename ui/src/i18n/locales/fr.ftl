# Freally Teleprompt — Français (French).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Paramètres
toolbar-bug-report = Signaler un problème
toolbar-updates = Rechercher des mises à jour

## Transport
transport-play = Lecture
transport-pause = Pause
transport-restart = Revenir au début

## Editor
editor-label = Script
editor-placeholder = Saisissez ou collez votre script. Utilisez " -- " pour une pause, ou " --2 " pour marquer 2 secondes.
editor-load = Charger dans le prompteur

## Prompter surface
teleprompter-empty = Aucun script chargé pour l'instant. Saisissez-en un à gauche, puis choisissez « Charger dans le prompteur ».

## Settings
settings-title = Paramètres
settings-language = Langue
settings-language-auto = Comme mon système
settings-theme = Thème
settings-theme-dark = Sombre
settings-theme-light = Clair
settings-speed = Vitesse de lecture — { $value } caractères par seconde
settings-font-size = Taille de police — { $value } px
settings-caesura = Pause par défaut pour " -- " — { $value } secondes
settings-countdown = Compte à rebours avant le départ — { $value } secondes
settings-mirror = Inverser l'image du projecteur (pour verre semi-réfléchissant)
settings-cancel = Annuler
settings-apply = Appliquer

## First-run agreement
eula-title = Contrat de licence utilisateur final
eula-version = Version { $version }
eula-intro = Veuillez lire ce contrat. Vous devez l'accepter avant d'utiliser Freally Teleprompt.
eula-scroll-hint = Faites défiler jusqu'à la fin pour continuer.
eula-thanks = Merci d'avoir lu.
eula-agree = J'accepte
eula-decline = Refuser et quitter

## Problem report
bug-title = Signaler un problème
bug-intro = Rien n'est envoyé automatiquement. Vous choisissez le mode d'envoi et vous pouvez d'abord lire ci-dessous le texte exact.
bug-crash-attached = Freally Teleprompt s'est arrêté de façon inattendue la dernière fois. Les détails sont joints ci-dessous.
bug-what-happened = Que s'est-il passé ?
bug-what-happened-placeholder = Que faisiez-vous au moment du problème ?
bug-preview-label = Exactement ce qui sera envoyé
bug-open-github = Ouvrir un ticket GitHub
bug-compose-gmail = Rédiger dans Gmail
bug-send-email = Envoyer par e-mail
bug-copy = Copier le rapport
bug-copied = Copié
bug-dismiss-crash = Ignorer le plantage
bug-close = Fermer

## Updates
updates-title = Mise à jour disponible
updates-available = Freally Teleprompt { $version } est disponible. Vous avez la { $current }.
updates-notes-label = Nouveautés
updates-yes = Oui, mettre à jour maintenant
updates-no = Non, pas maintenant
updates-installing = Téléchargement et installation…
updates-none = Vous avez la dernière version.
updates-error = Impossible de rechercher des mises à jour.
updates-checking = Recherche de mises à jour…

## Startup
startup-failed = Freally Teleprompt n'a pas pu démarrer.
