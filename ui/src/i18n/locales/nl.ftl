# Freally Teleprompt — Nederlands (Dutch).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Scripts
toolbar-projector = Projector openen
toolbar-settings = Instellingen
toolbar-bug-report = Een probleem melden
toolbar-updates = Controleren op updates

## Transport
transport-play = Afspelen
transport-pause = Pauze
transport-stop = Stoppen
transport-restart = Terug naar het begin
transport-rewind = Stap terug
transport-forward = Stap vooruit
transport-slower = Langzamer
transport-faster = Sneller
transport-seek = Door het script bladeren

## Editor
editor-label = Script
editor-placeholder = Typ of plak je script. Gebruik " -- " voor een pauze, of " --2 " om 2 seconden te wachten.
editor-unsaved = Niet-opgeslagen script
editor-caesura-hint = Typ -- voor een pauze
editor-est-time = Leestijd { $time }
editor-preview = Voorbeeld
editor-speed = Snelheid (tekens per seconde)
editor-speed-bpm = Snelheid (BPM)
editor-bpm-mode = BPM-modus (zang)
editor-read-aloud = Hardop voorlezen met de spraaksynthese van het besturingssysteem
editor-save-failed = Opslaan mislukt: { $error }

## Script library
library-title = Scripts
library-new = Nieuw
library-new-placeholder = Geef een nieuw script een naam
library-empty = Nog geen scripts. Geef er hierboven een naam om te beginnen.
library-open = Openen
library-current = geopend
library-rename = Naam wijzigen
library-save-name = Opslaan
library-delete = Verwijderen
library-delete-confirm = Verwijderen?
library-delete-yes = Ja
library-delete-no = Nee
library-close = Sluiten

## Projector
projector-title = Projector openen
projector-display = Scherm
projector-windowed = Zwevend venster (dit scherm)
projector-display-option = Scherm { $n } — { $w }×{ $h }
projector-primary = (primair)
projector-fill = Het hele scherm vullen
projector-mirror = Horizontaal spiegelen (voor spiegelglas)
projector-mirror-hint = Zet dit alleen aan als er door prompterglas gelezen wordt — dat glas keert het beeld om.
projector-open = Openen
projector-cancel = Annuleren
projector-exit-hint = Druk op Esc om af te sluiten
projector-window-title = Freally Teleprompt — projector

## Prompter surface
teleprompter-empty = Nog geen script geladen. Open er een bij Scripts, of begin links te typen.

## Settings
settings-title = Instellingen
settings-language = Taal
settings-language-auto = Hetzelfde als mijn systeem
settings-theme = Thema
settings-theme-dark = Donker
settings-theme-light = Licht
settings-section-reading = Lezen
settings-speed = Leessnelheid — { $value } tekens per seconde
settings-font-size = Tekengrootte — { $value } px
settings-caesura = Standaardpauze voor " -- " — { $value } seconden
settings-countdown = Aftellen voor de start — { $value } seconden
settings-section-appearance = Weergave
settings-font-family = Lettertype
settings-font-system = Systeem
settings-font-sans = Schreefloos
settings-font-serif = Met schreef
settings-font-mono = Vaste breedte
settings-font-rounded = Afgerond
settings-font-slab = Slab
settings-font-weight = Dikte
settings-text-color = Tekstkleur
settings-line-height = Regelafstand — { $value }
settings-margins = Zijmarges — { $value } %
settings-guide = Leeslijn — { $value } % van boven
settings-section-projector = Projector
settings-mirror = Projectie spiegelen (voor beamsplitterglas)
settings-section-mirror = Spiegelen naar mijn netwerk
settings-lan-enabled = Het script spiegelen naar apparaten in mijn netwerk
settings-lan-all-interfaces = Andere apparaten toestaan, niet alleen deze computer
settings-lan-warning = De link bevat een eenmalige sleutel en is niet versleuteld — gebruik dit alleen op een netwerk dat je vertrouwt. De spiegeling is alleen-lezen en je script wordt nergens geüpload.
settings-lan-port = Poort
settings-lan-open = In mijn browser openen
settings-lan-open-hint = Scan de code, of open deze link op een apparaat in hetzelfde netwerk.
settings-lan-failed = De spiegeling kon niet starten: { $error }
mirror-qr-aria = QR-code voor de spiegellink
settings-cancel = Annuleren
settings-apply = Toepassen

## First-run agreement
eula-title = Licentieovereenkomst voor eindgebruikers
eula-version = Versie { $version }
eula-intro = Lees deze overeenkomst. Je moet deze accepteren voordat je Freally Teleprompt gebruikt.
eula-scroll-hint = Scroll naar het einde om door te gaan.
eula-thanks = Bedankt voor het lezen.
eula-agree = Ik ga akkoord
eula-decline = Weigeren & afsluiten

## Problem report
bug-title = Een probleem melden
bug-intro = Er wordt niets automatisch verzonden. Jij bepaalt hoe je het verstuurt, en je kunt hieronder eerst de exacte tekst lezen.
bug-crash-attached = Freally Teleprompt is de vorige keer onverwacht gestopt. De details staan hieronder.
bug-what-happened = Wat is er gebeurd?
bug-what-happened-placeholder = Wat was je aan het doen toen het misging?
bug-preview-label = Precies wat er verzonden wordt
bug-open-github = Een GitHub-issue openen
bug-compose-gmail = Opstellen in Gmail
bug-send-email = Per e-mail versturen
bug-copy = Rapport kopiëren
bug-copied = Gekopieerd
bug-dismiss-crash = Crash negeren
bug-close = Sluiten

## Updates
updates-title = Update beschikbaar
updates-available = Freally Teleprompt { $version } is beschikbaar. Jij hebt { $current }.
updates-notes-label = Wat is er nieuw
updates-yes = Ja, nu bijwerken
updates-no = Nee, nu niet
updates-installing = Downloaden en installeren…
updates-none = Je hebt de nieuwste versie.
updates-error = Kan niet op updates controleren.
updates-checking = Controleren op updates…

## Startup
startup-failed = Freally Teleprompt kon niet starten.
