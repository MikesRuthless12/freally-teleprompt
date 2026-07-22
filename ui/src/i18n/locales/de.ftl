# Freally Teleprompt — Deutsch (German).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Einstellungen
toolbar-bug-report = Problem melden
toolbar-updates = Nach Updates suchen

## Transport
transport-play = Start
transport-pause = Pause
transport-restart = Zurück zum Anfang

## Editor
editor-label = Skript
editor-placeholder = Tippe oder füge dein Skript ein. Verwende " -- " für eine Pause oder " --2 " für 2 Sekunden.
editor-load = In den Prompter laden

## Prompter surface
teleprompter-empty = Noch kein Skript geladen. Tippe links eines ein und wähle dann „In den Prompter laden“.

## Settings
settings-title = Einstellungen
settings-language = Sprache
settings-language-auto = Wie mein System
settings-theme = Design
settings-theme-dark = Dunkel
settings-theme-light = Hell
settings-speed = Lesetempo — { $value } Zeichen pro Sekunde
settings-font-size = Schriftgröße — { $value } px
settings-caesura = Standardpause für " -- " — { $value } Sekunden
settings-countdown = Countdown vor dem Start — { $value } Sekunden
settings-mirror = Projektion spiegeln (für Strahlteilerglas)
settings-cancel = Abbrechen
settings-apply = Anwenden

## First-run agreement
eula-title = Endbenutzer-Lizenzvereinbarung
eula-version = Version { $version }
eula-intro = Bitte lies diese Vereinbarung. Du musst ihr zustimmen, bevor du Freally Teleprompt verwendest.
eula-scroll-hint = Scrolle zum Ende, um fortzufahren.
eula-thanks = Danke fürs Lesen.
eula-agree = Ich stimme zu
eula-decline = Ablehnen & Beenden

## Problem report
bug-title = Problem melden
bug-intro = Es wird nichts automatisch gesendet. Du entscheidest, wie du den Bericht verschickst, und kannst den genauen Text unten vorher lesen.
bug-crash-attached = Freally Teleprompt wurde beim letzten Mal unerwartet beendet. Die Details sind unten angehängt.
bug-what-happened = Was ist passiert?
bug-what-happened-placeholder = Was hast du gerade getan, als es schiefging?
bug-preview-label = Genau das, was gesendet wird
bug-open-github = GitHub-Issue öffnen
bug-compose-gmail = In Gmail verfassen
bug-send-email = Per E-Mail senden
bug-copy = Bericht kopieren
bug-copied = Kopiert
bug-dismiss-crash = Absturz verwerfen
bug-close = Schließen

## Updates
updates-title = Update verfügbar
updates-available = Freally Teleprompt { $version } ist verfügbar. Du hast { $current }.
updates-notes-label = Neuerungen
updates-yes = Ja, jetzt aktualisieren
updates-no = Nein, nicht jetzt
updates-installing = Wird heruntergeladen und installiert…
updates-none = Du hast die neueste Version.
updates-error = Updates konnten nicht geprüft werden.
updates-checking = Suche nach Updates…

## Startup
startup-failed = Freally Teleprompt konnte nicht gestartet werden.
