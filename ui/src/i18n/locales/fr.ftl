# Freally Teleprompt — Français (French).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Scripts
toolbar-projector = Ouvrir le projecteur
toolbar-settings = Paramètres
toolbar-about = À propos
toolbar-bug-report = Signaler un problème
toolbar-updates = Rechercher des mises à jour

## Window controls (the app draws its own title bar)
window-minimize = Réduire
window-maximize = Agrandir
window-restore = Restaurer
window-close = Fermer

## System tray
tray-show = Afficher Freally Teleprompt
tray-quit = Quitter

## About
about-version = Version { $version }
about-tagline = Un prompteur local pour créateurs, conférenciers et artistes. Un même moteur fondé sur les caractères garde l'aperçu, le projecteur et la diffusion réseau sur le même mot.
about-privacy = Pas d'IA, pas de compte, pas de télémétrie. Vos scripts restent sur votre appareil.
about-copyright = © 2026 Mike Weaver — Havoc Software. Tous droits réservés.
about-website = Site web
about-source = Code source
about-close = Fermer

## Transport
transport-play = Lecture
transport-pause = Pause
transport-stop = Arrêter
transport-restart = Revenir au début
transport-rewind = Reculer
transport-forward = Avancer
transport-slower = Plus lent
transport-faster = Plus rapide
transport-seek = Se déplacer dans le script

## Editor
editor-label = Script
editor-placeholder = Saisissez ou collez votre script. Utilisez " -- " pour une pause, ou " --2 " pour marquer 2 secondes.
editor-caesura-hint = Tapez -- pour une pause
editor-est-time = Temps de lecture { $time }
editor-speed = Vitesse (caractères par seconde)
editor-speed-bpm = Vitesse (BPM)
editor-bpm-mode = Mode BPM (chant)
editor-read-aloud = Lire à voix haute avec la synthèse vocale du système
editor-save-failed = Enregistrement impossible : { $error }

## Script library
library-title = Scripts
library-new = Nouveau
library-new-placeholder = Nommez un nouveau script
library-empty = Aucun script pour l'instant. Nommez-en un ci-dessus pour commencer.
library-open = Ouvrir
library-current = ouvert
library-rename = Renommer
library-save-name = Enregistrer
library-delete = Supprimer
library-delete-confirm = Le supprimer ?
library-delete-yes = Oui
library-delete-no = Non
library-close = Fermer

## Projector
projector-title = Ouvrir le projecteur
projector-display = Écran
projector-windowed = Fenêtre flottante (cet écran)
projector-display-option = Écran { $n } — { $w }×{ $h }
projector-primary = (principal)
projector-fill = Occuper tout l'écran
projector-mirror = Miroir horizontal (pour verre séparateur)
projector-mirror-hint = À activer uniquement si la lecture se fait à travers le verre du prompteur, qui inverse l'image.
projector-open = Ouvrir
projector-cancel = Annuler
projector-exit-hint = Appuyez sur Échap pour quitter
projector-window-title = Freally Teleprompt — projecteur

## Prompter surface
teleprompter-empty = Aucun script chargé. Ouvrez-en un depuis Scripts, ou commencez à taper à gauche.

## Settings
settings-title = Paramètres
settings-search-placeholder = Rechercher dans les paramètres…
settings-search-none = Aucun paramètre correspondant.
settings-changed = Modifié depuis l'ouverture
settings-ok = OK
settings-cat-general = Général
settings-cat-editor = Éditeur
settings-cat-reading = Lecture
settings-cat-appearance = Apparence
settings-cat-projector = Projecteur
settings-cat-network = Réseau
settings-language = Langue
settings-language-auto = Comme mon système
settings-theme = Thème
settings-theme-dark = Sombre
settings-theme-light = Clair
settings-window-section = Fenêtre
settings-minimize-to-tray = Réduire dans la zone de notification
settings-minimize-to-tray-note = Le bouton Réduire masque la fenêtre au lieu de l'envoyer dans la barre des tâches. Cliquez sur l'icône de la zone de notification pour la faire revenir. L'icône n'existe que tant que la fenêtre est masquée : la restaurer la fait disparaître.
settings-autocomplete-section = Saisie automatique
settings-autocomplete = Proposer des mots pendant la saisie
settings-autocomplete-note = Le texte suggéré apparaît en grisé devant le curseur. Appuyez sur Tab pour l'accepter ou sur Esc pour l'ignorer. Les suggestions proviennent de listes de mots intégrées à l'application — rien de ce que vous écrivez n'est envoyé où que ce soit.
settings-autocomplete-language = Langue des suggestions
settings-autocomplete-language-auto = Comme la langue de l'application
settings-lan-off-hint = La diffusion est désactivée. Activez-la puis appuyez sur Appliquer pour obtenir un lien et un QR code.
settings-section-reading = Lecture
settings-speed = Vitesse de lecture — { $value } caractères par seconde
settings-font-size = Taille de police — { $value } px
settings-caesura = Pause par défaut pour " -- " — { $value } secondes
settings-countdown = Compte à rebours avant le départ — { $value } secondes
settings-section-appearance = Apparence
settings-font-family = Police
settings-font-system = Système
settings-font-sans = Sans empattement
settings-font-serif = Avec empattement
settings-font-mono = Chasse fixe
settings-font-rounded = Arrondie
settings-font-slab = Égyptienne
settings-font-weight = Graisse
settings-text-color = Couleur du texte
settings-line-height = Interligne — { $value }
settings-margins = Marges latérales — { $value } %
settings-guide = Ligne de lecture — { $value } % depuis le haut
settings-section-projector = Projecteur
settings-mirror = Inverser l'image du projecteur (pour verre semi-réfléchissant)
settings-section-mirror = Diffuser sur mon réseau
settings-lan-enabled = Diffuser le script vers les appareils de mon réseau
settings-lan-all-interfaces = Autoriser d'autres appareils, pas seulement cet ordinateur
settings-lan-warning = Le lien contient une clé à usage unique et n'est pas chiffré : ne l'utilisez que sur un réseau de confiance. La diffusion est en lecture seule et votre script n'est jamais téléversé.
settings-lan-port = Port
settings-lan-open = Ouvrir dans mon navigateur
settings-lan-open-hint = Scannez le code, ou ouvrez ce lien sur n'importe quel appareil du même réseau.
settings-lan-failed = La diffusion n'a pas pu démarrer : { $error }
mirror-qr-aria = Code QR du lien de diffusion
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

## Voice control (FT-31)
settings-cat-voice = Voix
settings-voice-enabled = Contrôler le prompteur à la voix
settings-voice-note = Les commandes s'exécutent sur cet appareil et sont comparées à de courts enregistrements de votre propre voix. Aucun modèle ni réseau — le microphone ne s'ouvre que pendant l'écoute, et rien de ce que vous dites n'est jamais enregistré dans un fichier.
settings-voice-mode = Quand écouter
settings-voice-mode-ptt = Seulement quand je maintiens le bouton
settings-voice-mode-always = Toujours, une fois activé
settings-voice-commands = Vos commandes
settings-voice-commands-note = Enregistrez chaque commande avec votre propre voix deux ou trois fois. Plus d'enregistrements la rendent plus fiable.
settings-voice-record = Enregistrer
settings-voice-recording = Écoute…
settings-voice-forget = Oublier
settings-voice-takes = { $count } enregistrées
settings-voice-untrained = Non enregistrée
voice-cmd-next = Pause suivante
voice-listening = Écoute
voice-hold-to-talk = Maintenir pour parler
settings-voice-follow = Suivre ma lecture
settings-voice-follow-note = Quand vous parlez, le script défile pour vous suivre — il reconnaît les mots du script sur cet appareil. Il s'efface dès qu'il perd votre position, pour ne jamais vous gêner.
settings-voice-follow-unavailable-build = Le suivi vocal n'est pas disponible dans cette version.
settings-voice-follow-unavailable-model = Le modèle vocal n'est pas encore installé, le suivi vocal ne peut donc pas fonctionner.
voice-following = Suivi
voice-following-acquiring = Recherche de votre position…
