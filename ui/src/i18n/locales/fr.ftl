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
about-copyright = © 2026 Mike Weaver. Tous droits réservés.
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
editor-dictate = Dicter
editor-dictate-stop = Arrêter la dictée
editor-dictate-hint = Appuyez sur enregistrer pour démarrer la dictée
editor-dictate-hint-stop = Appuyez sur arrêter pour terminer la dictée
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
settings-theme-system = Comme mon système
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

## Onboarding tour (FT-50)
tour-step = { $n } sur { $total }
tour-skip = Passer
tour-back = Retour
tour-next = Suivant
tour-done = Commencer à écrire
tour-welcome-title = Bienvenue dans Freally Teleprompt
tour-welcome-body = Un prompteur qui fonctionne entièrement sur votre machine. Pas de compte, pas de cloud, pas d'IA, aucun abonnement. Comptez une minute — appuyez sur Passer quand vous voulez, et relancez la visite depuis les réglages.
tour-write-title = Écrivez votre texte
tour-write-body = Tapez ou collez à gauche. Ouvrez Script pour en garder plusieurs ; tout est enregistré au fil de la frappe. Deux tirets marquent une pause que vous voulez tenir, et les suggestions grisées devant le curseur terminent les mots longs à votre place.
tour-read-title = Réglez votre rythme
tour-read-body = La vitesse est un vrai rythme de lecture — caractères par seconde — ou passez en BPM si vous rappez ou chantez sur un tempo. Lecture, pause et retour se trouvent sous l'éditeur, ou cliquez sur n'importe quel mot de l'aperçu pour partir de là. Le mot allumé reste toujours sur la ligne de lecture.
tour-show-title = Montrez-le à qui lit
tour-show-body = Le projecteur affiche le texte sur un second écran, inversé pour un miroir sans tain si vous lisez à travers, ou renvoyé vers un téléphone sur votre propre réseau. Tout le reste — police, couleur, marges, langue, thème — se trouve derrière l'engrenage de la barre de titre.
settings-tour-section = Premiers pas
settings-tour-replay = Revoir la visite
settings-tour-replay-note = Relance la présentation en quatre étapes de l'éditeur, des commandes de rythme et du projecteur. Les réglages se ferment d'abord, pour que vous voyiez ce dont il est question.

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
settings-dictation-enabled = Écrire mon texte en parlant
settings-dictation-note = Appuyez sur le bouton d'enregistrement au-dessus du texte et ce que vous dites y est écrit. La reconnaissance a lieu sur cet appareil — sans compte, sans réseau, et rien de ce que vous dites n'est enregistré dans un fichier. Le microphone n'est ouvert que pendant l'enregistrement. Si le script est diffusé vers les appareils de votre réseau, les mots dictés y parviennent à mesure qu'ils s'écrivent, comme tout ce que vous tapez.
settings-dictation-unavailable-model = Le modèle vocal n'est pas installé, la dictée ne peut donc pas fonctionner.
settings-dictation-unavailable-build = La dictée n'est pas disponible dans cette version.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Mesure { $bar } · { $beat }
tempo-count-in = Décompte { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Répéter et chronométrer ma lecture
pace-behind = { $time } de retard
pace-ahead = { $time } d'avance
rehearsal-title = Rapport de répétition
rehearsal-empty = Rien n'a encore été chronométré. Activez ceci, jouez le script en entier, puis désactivez-le.
rehearsal-col-section = Section
rehearsal-col-planned = Prévu
rehearsal-col-actual = Réel
rehearsal-col-delta = Écart
rehearsal-unfinished = non terminée
rehearsal-suggest = Vous avez lu à environ { $to } caractères par seconde, et non { $from }.
rehearsal-suggest-apply = Utiliser cette vitesse
rehearsal-close = Fermer

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Minutage
settings-tempo-section = Tempo
settings-metronome = Jouer un clic au tempo actuel
settings-metronome-note = Un tic discret sur chaque temps pendant le défilement, accentué sur le premier temps de la mesure. Le décompte de départ lui sert de décompte préparatoire. L'application produit le son elle-même — rien n'est téléchargé.
settings-beats-per-bar = Temps par mesure
settings-calibration-section = Votre propre tempo
settings-chars-per-beat = { $value } caractères par temps
settings-chars-per-beat-note = Un tempo devient une vitesse de lecture grâce à un seul nombre : combien de caractères vous parcourez en un temps. Tapez au tempo auquel vous interprétez et il sera mesuré d'après votre vitesse de lecture au lieu d'être supposé.
settings-tap-tempo = Taper
settings-tap-hint = Tapez au moins trois fois
settings-tap-bpm = Tapé : { $bpm } BPM
settings-tap-apply = Utiliser ce tempo
settings-tap-reset = Revenir à la valeur par défaut
settings-skip-section = Mots que vous n'interprétez pas
settings-skip-words = Mots à ignorer
settings-skip-words-note = Un par ligne. Une ligne qui ne contient que l'un d'eux — Refrain, Couplet 1, Pont — ne coûte aucun temps, si bien que vos paroles restent sur la mesure pour laquelle vous les avez écrites. Le même mot au milieu d'une vraie ligne n'ignore que lui-même. Ils restent affichés, atténués, et la lecture à voix haute ne les prononce jamais.
settings-skip-words-placeholder = Un mot par ligne
