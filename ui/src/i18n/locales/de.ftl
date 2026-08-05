# Freally Teleprompt — Deutsch (German).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Skripte
toolbar-import = Importieren
toolbar-find = Suchen
toolbar-shortcuts = Tastenkürzel
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
about-copyright = © 2026 Mike Weaver. Alle Rechte vorbehalten.
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
editor-dictate = Diktieren
editor-dictate-stop = Diktat beenden
editor-dictate-hint = Zum Diktieren auf Aufnahme drücken
editor-dictate-hint-stop = Zum Beenden auf Stopp drücken
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
settings-theme-system = Wie mein System
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

## Onboarding tour (FT-50)
tour-step = { $n } von { $total }
tour-skip = Überspringen
tour-back = Zurück
tour-next = Weiter
tour-done = Los geht's
tour-welcome-title = Willkommen bei Freally Teleprompt
tour-welcome-body = Ein Teleprompter, der vollständig auf deinem eigenen Rechner läuft. Kein Konto, keine Cloud, keine KI, kein Abo. Das dauert etwa eine Minute – du kannst jederzeit überspringen und die Tour später in den Einstellungen erneut starten.
tour-write-title = Schreib dein Skript
tour-write-body = Tippe oder füge links ein. Über Skripte verwaltest du mehrere Texte; alles wird beim Schreiben gespeichert. Zwei Bindestriche setzen eine Pause, die du halten möchtest, und die blassen Vorschläge vor dem Cursor vervollständigen lange Wörter für dich.
tour-read-title = Bestimme dein Tempo
tour-read-body = Die Geschwindigkeit ist ein echtes Lesetempo – Zeichen pro Sekunde – oder wechsle zu BPM, wenn du zu einem Beat rappst oder singst. Wiedergabe, Pause und Rücklauf liegen unter dem Editor, oder klicke in der Vorschau auf ein beliebiges Wort, um dort zu beginnen. Das hervorgehobene Wort steht immer auf der Leselinie.
tour-show-title = Zeig es der Sprecherin oder dem Sprecher
tour-show-body = Der Projektor bringt das Skript auf einen zweiten Bildschirm, bei Bedarf für Spiegelglas gespiegelt, oder überträgt es auf ein Telefon im eigenen Netzwerk. Alles andere – Schrift, Farbe, Ränder, Sprache, Design – liegt hinter dem Zahnrad in der Titelleiste.
settings-tour-section = Erste Schritte
settings-tour-replay = Tour erneut anzeigen
settings-tour-replay-note = Startet die vierteilige Einführung zu Editor, Temporeglern und Projektor. Die Einstellungen werden zuerst geschlossen, damit du siehst, worum es geht.

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
settings-dictation-enabled = Mein Skript durch Sprechen schreiben
settings-dictation-note = Drücken Sie die Aufnahmetaste über dem Skript, und was Sie sagen, wird hineingeschrieben. Die Erkennung läuft auf diesem Gerät — kein Konto, kein Netzwerk, und nichts von dem, was Sie sagen, wird je in eine Datei geschrieben. Das Mikrofon ist nur während der Aufnahme offen. Wird das Skript auf Geräte in Ihrem Netzwerk gespiegelt, erreichen diktierte Wörter diese, sobald sie geschrieben werden — genau wie alles, was Sie tippen.
settings-dictation-unavailable-model = Das Sprachmodell ist nicht installiert, daher kann das Diktat nicht laufen.
settings-dictation-unavailable-build = Diktat ist in dieser Version nicht verfügbar.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Takt { $bar } · { $beat }
tempo-count-in = Einzähler { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Proben und meinen Vortrag messen
pace-behind = { $time } über der Zeit
pace-ahead = { $time } unter der Zeit
rehearsal-title = Probenbericht
rehearsal-empty = Es wurde noch nichts gemessen. Schalte dies ein, spiele das Skript durch und schalte es wieder aus.
rehearsal-col-section = Abschnitt
rehearsal-col-planned = Geplant
rehearsal-col-actual = Tatsächlich
rehearsal-col-delta = Differenz
rehearsal-unfinished = nicht beendet
rehearsal-suggest = Du hast das mit etwa { $to } Zeichen pro Sekunde gelesen, nicht { $from }.
rehearsal-suggest-apply = Dieses Tempo übernehmen
rehearsal-close = Schließen

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Zeitmaß
settings-tempo-section = Tempo
settings-metronome = Klick im aktuellen Tempo abspielen
settings-metronome-note = Ein leiser Tick auf jedem Schlag, während das Skript läuft, betont auf der Eins. Der Startcountdown wird zum Einzähler. Die App erzeugt den Ton selbst — es wird nichts heruntergeladen.
settings-beats-per-bar = Schläge pro Takt
settings-calibration-section = Dein eigenes Tempo
settings-chars-per-beat = { $value } Zeichen pro Schlag
settings-chars-per-beat-note = Ein Tempo wird über eine einzige Zahl zur Lesegeschwindigkeit: wie viele Zeichen du in einem Schlag schaffst. Tippe im Tempo mit, in dem du vorträgst, dann wird sie an deiner Lesegeschwindigkeit gemessen statt geschätzt.
settings-tap-tempo = Tippen
settings-tap-hint = Mindestens dreimal tippen
settings-tap-bpm = Getippt: { $bpm } BPM
settings-tap-apply = Dieses Tempo verwenden
settings-tap-reset = Zurück zum Standard
settings-skip-section = Wörter, die du nicht vorträgst
settings-skip-words = Zu überspringende Wörter
settings-skip-words-note = Eines pro Zeile. Eine Zeile, die nur aus einem davon besteht — Refrain, Strophe 1, Bridge — kostet überhaupt keine Zeit, sodass dein Text auf dem Takt bleibt, für den du ihn geschrieben hast. Dasselbe Wort mitten in einer echten Zeile überspringt nur sich selbst. Sie bleiben gedimmt sichtbar, und das Vorlesen spricht sie nie aus.
settings-skip-words-placeholder = Ein Wort pro Zeile

## Document import (FT-M01)
import-title = Dokument importieren
import-choose = Dokument auswählen ...
import-hint = Word, RTF, PDF, reiner Text oder Markdown.
import-filter = Dokumente
import-reading = Dokument wird gelesen ...
import-format-txt = reiner Text
import-format-markdown = Markdown
import-format-docx = Word-Dokument
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = { $format } gelesen: { $chars } Zeichen in { $paragraphs } Absätzen.
import-flattened = Fett, Kursiv, Schriftarten und Farben wurden zu reinem Prompter-Text vereinfacht.
import-truncated = Das Dokument war länger, als ein Skript sein darf, und wurde gekürzt.
import-nothing-dropped = Sonst ging nichts verloren.
import-not-itemised = Der Inhalt einer PDF lässt sich nicht auflisten - vergleichen Sie den Text mit dem Original.
import-drop-encoding = Die Datei war nicht als Unicode gespeichert und wurde als westeuropäischer Text gelesen.
import-drop-images = Ausgelassene Bilder: { $count }
import-drop-footnotes = Ausgelassene Fußnoten: { $count }
import-drop-comments = Ausgelassene Kommentare: { $count }
import-drop-headersFooters = Ausgelassene Kopf- und Fußzeilen: { $count }
import-drop-linkTargets = Ausgelassene Linkziele (der Text bleibt): { $count }
import-drop-objects = Ausgelassene eingebettete Objekte: { $count }
import-preview = Der Prompter-Text
import-name = Speichern als
import-confirm = Importieren
import-cancel = Abbrechen

## Find and replace (FT-M07)
find-title = Suchen und ersetzen
find-what = Suchen
find-with = Ersetzen durch
find-case = Groß-/Kleinschreibung beachten
find-whole-word = Nur ganze Wörter
find-count = { $at } von { $total }
find-none = Keine Treffer
find-replaced = { $count } ersetzt
find-previous = Zurück
find-next = Weiter
find-replace = Ersetzen
find-replace-all = Alle ersetzen
find-close = Schließen

## Tastenkürzel, Fußschalter und globale Tastenkürzel (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = Tastenkürzel und Fußschalter
shortcuts-intro = Klicken Sie auf eine Belegung, um sie zu ändern, und drücken Sie dann die gewünschte Taste, Fernbedienung oder den Fußschalter. Tastenkürzel „In der App“ wirken, solange Freally Teleprompt im Vordergrund ist; „Überall“ wirkt unabhängig davon, wo Sie gerade arbeiten.
shortcuts-search = Befehle und Tasten durchsuchen
shortcuts-command = Befehl
shortcuts-in-app = In der App
shortcuts-global = Überall
shortcuts-window-only = Nur in der App
shortcuts-no-matches = Keine Befehle gefunden.
shortcuts-listening = Taste für { $command } drücken, oder Esc zum Abbrechen
shortcuts-listening-short = Taste drücken …
shortcuts-rebind = Belegung für { $command } ändern
shortcuts-clear = Belegung für { $command } löschen
shortcuts-conflict = Auch belegt mit { $others }
shortcuts-not-registered = Ein anderes Programm verwendet diese Taste ({ $reason })
shortcuts-wayland = Unter Wayland dürfen Anwendungen keine systemweiten Tasten belegen, daher funktionieren „Überall“-Belegungen in dieser Sitzung möglicherweise nicht.
shortcuts-reset = Standard wiederherstellen
shortcuts-cancel = Abbrechen
shortcuts-apply = Übernehmen
cmd-play-pause = Wiedergabe / Pause
cmd-stop = Stopp
cmd-top = Zurück zum Anfang
cmd-faster = Schneller
cmd-slower = Langsamer
cmd-step-back = Schritt zurück
cmd-step-forward = Schritt vorwärts
cmd-next-marker = Nächster Abschnitt
cmd-prev-marker = Voriger Abschnitt
cmd-find = Suchen und ersetzen

## Section markers (FT-M05)
marker-list = Zu einem Abschnitt springen
marker-previous = Vorheriger Abschnitt
marker-next = Nächster Abschnitt
marker-none-yet = Vor der ersten Marke

## Script statistics (FT-M03)
stats-counts = { $words } Wörter, { $chars } Zeichen
stats-long-line = Zeile { $line } ist sehr lang ({ $chars } Zeichen)
