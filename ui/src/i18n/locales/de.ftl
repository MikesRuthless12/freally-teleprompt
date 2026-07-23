# Freally Teleprompt — Deutsch (German).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Skripte
toolbar-projector = Projektor öffnen
toolbar-settings = Einstellungen
toolbar-about = Über
toolbar-bug-report = Problem melden
toolbar-updates = Nach Updates suchen

## Window controls (the app draws its own title bar)
window-minimize = Minimieren
window-maximize = Maximieren
window-restore = Wiederherstellen
window-close = Schließen

## System tray
tray-show = Freally Teleprompt anzeigen
tray-quit = Beenden

## About
about-version = Version { $version }
about-tagline = Ein lokal arbeitender Teleprompter für Kreative, Vortragende und Bühnenprofis. Eine zeichenbasierte Engine hält Vorschau, Projektor und Netzwerkspiegel auf demselben Wort.
about-privacy = Keine KI, kein Konto, keine Telemetrie. Deine Skripte bleiben auf deinem Gerät.
about-copyright = © 2026 Mike Weaver — Havoc Software. Alle Rechte vorbehalten.
about-website = Website
about-source = Quellcode
about-close = Schließen

## Transport
transport-play = Start
transport-pause = Pause
transport-stop = Stopp
transport-restart = Zurück zum Anfang
transport-rewind = Schritt zurück
transport-forward = Schritt vor
transport-slower = Langsamer
transport-faster = Schneller
transport-seek = Im Skript navigieren

## Editor
editor-label = Skript
editor-placeholder = Tippe oder füge dein Skript ein. Verwende " -- " für eine Pause oder " --2 " für 2 Sekunden.
editor-caesura-hint = Für eine Pause -- eingeben
editor-est-time = Lesezeit { $time }
editor-speed = Tempo (Zeichen pro Sekunde)
editor-speed-bpm = Tempo (BPM)
editor-bpm-mode = BPM-Modus (Gesang)
editor-read-aloud = Mit betriebssystemeigener Sprachsynthese vorlesen
editor-save-failed = Speichern fehlgeschlagen: { $error }

## Script library
library-title = Skripte
library-new = Neu
library-new-placeholder = Name für ein neues Skript
library-empty = Noch keine Skripte. Vergib oben einen Namen, um zu beginnen.
library-open = Öffnen
library-current = geöffnet
library-rename = Umbenennen
library-save-name = Sichern
library-delete = Löschen
library-delete-confirm = Wirklich löschen?
library-delete-yes = Ja
library-delete-no = Nein
library-close = Schließen

## Projector
projector-title = Projektor öffnen
projector-display = Bildschirm
projector-windowed = Schwebendes Fenster (dieser Bildschirm)
projector-display-option = Bildschirm { $n } — { $w }×{ $h }
projector-primary = (primär)
projector-fill = Bildschirm vollständig ausfüllen
projector-mirror = Horizontal spiegeln (für Strahlteilerglas)
projector-mirror-hint = Nur aktivieren, wenn durch Prompterglas gelesen wird — das Glas kehrt das Bild um.
projector-open = Öffnen
projector-cancel = Abbrechen
projector-exit-hint = Zum Beenden Esc drücken
projector-window-title = Freally Teleprompt — Projektor

## Prompter surface
teleprompter-empty = Noch kein Skript geladen. Öffne eines unter „Skripte“ oder tippe links los.

## Settings
settings-title = Einstellungen
settings-search-placeholder = Einstellungen durchsuchen…
settings-search-none = Keine passenden Einstellungen.
settings-changed = Seit dem Öffnen geändert
settings-ok = OK
settings-cat-general = Allgemein
settings-cat-editor = Editor
settings-cat-reading = Lesen
settings-cat-appearance = Darstellung
settings-cat-projector = Projektor
settings-cat-network = Netzwerk
settings-language = Sprache
settings-language-auto = Wie mein System
settings-theme = Design
settings-theme-dark = Dunkel
settings-theme-light = Hell
settings-window-section = Fenster
settings-minimize-to-tray = In den Infobereich minimieren
settings-minimize-to-tray-note = Die Schaltfläche „Minimieren“ blendet das Fenster aus, statt es in die Taskleiste zu legen. Ein Klick auf das Symbol im Infobereich holt es zurück. Das Symbol existiert nur, solange das Fenster ausgeblendet ist — beim Wiederherstellen verschwindet es wieder.
settings-autocomplete-section = Autovervollständigung
settings-autocomplete = Wörter beim Tippen vorschlagen
settings-autocomplete-note = Vorgeschlagener Text erscheint abgeblendet vor dem Cursor. Drücken Sie Tab, um ihn zu übernehmen, oder Esc, um ihn zu verwerfen. Die Vorschläge stammen aus Wortlisten in der App — nichts von dem, was Sie schreiben, wird irgendwohin gesendet.
settings-autocomplete-language = Sprache der Vorschläge
settings-autocomplete-language-auto = Wie die App-Sprache
settings-lan-off-hint = Die Spiegelung ist aus. Schalte sie ein und drücke Anwenden, um Link und QR-Code zu erhalten.
settings-section-reading = Lesen
settings-speed = Lesetempo — { $value } Zeichen pro Sekunde
settings-font-size = Schriftgröße — { $value } px
settings-caesura = Standardpause für " -- " — { $value } Sekunden
settings-countdown = Countdown vor dem Start — { $value } Sekunden
settings-section-appearance = Darstellung
settings-font-family = Schriftart
settings-font-system = System
settings-font-sans = Serifenlos
settings-font-serif = Serif
settings-font-mono = Monospace
settings-font-rounded = Abgerundet
settings-font-slab = Slab
settings-font-weight = Schriftstärke
settings-text-color = Textfarbe
settings-line-height = Zeilenabstand — { $value }
settings-margins = Seitenränder — { $value } %
settings-guide = Leselinie — { $value } % von oben
settings-section-projector = Projektor
settings-mirror = Projektion spiegeln (für Strahlteilerglas)
settings-section-mirror = Auf mein Netzwerk spiegeln
settings-lan-enabled = Skript auf Geräte in meinem Netzwerk spiegeln
settings-lan-all-interfaces = Andere Geräte zulassen, nicht nur diesen Computer
settings-lan-warning = Der Link enthält einen Einmalschlüssel und ist unverschlüsselt — nutze ihn nur in einem Netzwerk, dem du vertraust. Die Spiegelung ist schreibgeschützt, und dein Skript wird nirgendwohin hochgeladen.
settings-lan-port = Port
settings-lan-open = Im Browser öffnen
settings-lan-open-hint = Scanne den Code oder öffne diesen Link auf einem Gerät im selben Netzwerk.
settings-lan-failed = Die Spiegelung konnte nicht gestartet werden: { $error }
mirror-qr-aria = QR-Code für den Spiegelungs-Link
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

## Voice control (FT-31)
settings-cat-voice = Stimme
settings-voice-enabled = Den Prompter mit meiner Stimme steuern
settings-voice-note = Befehle laufen auf diesem Gerät und werden mit kurzen Aufnahmen deiner eigenen Stimme abgeglichen. Kein Modell und kein Netzwerk — das Mikrofon öffnet sich nur während des Zuhörens, und nichts, was du sagst, wird jemals in einer Datei gespeichert.
settings-voice-mode = Wann zugehört wird
settings-voice-mode-ptt = Nur während ich die Taste halte
settings-voice-mode-always = Immer, solange aktiviert
settings-voice-commands = Deine Befehle
settings-voice-commands-note = Nimm jeden Befehl zwei- oder dreimal mit deiner eigenen Stimme auf. Mehr Aufnahmen machen es zuverlässiger.
settings-voice-record = Aufnehmen
settings-voice-recording = Höre zu…
settings-voice-forget = Vergessen
settings-voice-takes = { $count } aufgenommen
settings-voice-untrained = Nicht aufgenommen
voice-cmd-next = Nächste Pause
voice-listening = Höre zu
voice-hold-to-talk = Zum Sprechen halten
settings-voice-follow = Meinem Lesen folgen
settings-voice-follow-note = Wenn du sprichst, scrollt das Skript mit — es erkennt die Wörter des Skripts direkt auf diesem Gerät. Sobald es deine Stelle verliert, tritt es zur Seite, damit es dir nie in die Quere kommt.
settings-voice-follow-unavailable-build = Das Folgen per Stimme ist in dieser Version nicht verfügbar.
settings-voice-follow-unavailable-model = Das Sprachmodell ist noch nicht installiert, daher kann das Folgen per Stimme nicht laufen.
voice-following = Folgt
voice-following-acquiring = Suche deine Stelle…
