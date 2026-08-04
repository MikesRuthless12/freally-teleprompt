# Freally Teleprompt — Nederlands (Dutch).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Scripts
toolbar-import = Importeren
toolbar-find = Zoeken
toolbar-projector = Projector openen
toolbar-settings = Instellingen
toolbar-about = Over
toolbar-bug-report = Een probleem melden
toolbar-updates = Controleren op updates

## Window controls (the app draws its own title bar)
window-minimize = Minimaliseren
window-maximize = Maximaliseren
window-restore = Herstellen
window-close = Sluiten

## System tray
tray-show = Freally Teleprompt tonen
tray-quit = Afsluiten

## About
about-version = Versie { $version }
about-tagline = Een lokale autocue voor makers, sprekers en performers. Eén op tekens gebaseerde engine houdt de voorvertoning, de projector en de netwerkspiegel op hetzelfde woord.
about-privacy = Geen AI, geen account, geen telemetrie. Je scripts blijven op je eigen apparaat.
about-copyright = © 2026 Mike Weaver. Alle rechten voorbehouden.
about-website = Website
about-source = Broncode
about-close = Sluiten

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
editor-dictate = Dicteren
editor-dictate-stop = Dicteren stoppen
editor-dictate-hint = Druk op opnemen om te dicteren
editor-dictate-hint-stop = Druk op stoppen om het dicteren te beëindigen
editor-placeholder = Typ of plak je script. Gebruik " -- " voor een pauze, of " --2 " om 2 seconden te wachten.
editor-caesura-hint = Typ -- voor een pauze
editor-est-time = Leestijd { $time }
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
settings-search-placeholder = Instellingen zoeken…
settings-search-none = Geen overeenkomende instellingen.
settings-changed = Gewijzigd sinds openen
settings-ok = OK
settings-cat-general = Algemeen
settings-cat-editor = Editor
settings-cat-reading = Lezen
settings-cat-appearance = Weergave
settings-cat-projector = Projector
settings-cat-network = Netwerk
settings-language = Taal
settings-language-auto = Hetzelfde als mijn systeem
settings-theme = Thema
settings-theme-system = Hetzelfde als mijn systeem
settings-theme-dark = Donker
settings-theme-light = Licht
settings-window-section = Venster
settings-minimize-to-tray = Minimaliseren naar het systeemvak
settings-minimize-to-tray-note = De minimaliseerknop verbergt het venster in plaats van het naar de taakbalk te sturen. Klik op het pictogram in het systeemvak om het terug te halen. Het pictogram bestaat alleen zolang het venster verborgen is — bij herstellen verdwijnt het weer.
settings-autocomplete-section = Automatisch aanvullen
settings-autocomplete = Woorden voorstellen tijdens het typen
settings-autocomplete-note = Voorgestelde tekst verschijnt gedimd vóór de cursor. Druk op Tab om deze over te nemen of op Esc om deze te negeren. De suggesties komen uit woordenlijsten in de app — niets van wat u schrijft wordt ergens naartoe gestuurd.
settings-autocomplete-language = Taal van suggesties
settings-autocomplete-language-auto = Zelfde als de app-taal
settings-lan-off-hint = De spiegeling staat uit. Zet hem aan en druk op Toepassen voor een link en een QR-code.
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

## Onboarding tour (FT-50)
tour-step = { $n } van { $total }
tour-skip = Overslaan
tour-back = Terug
tour-next = Volgende
tour-done = Beginnen met schrijven
tour-welcome-title = Welkom bij Freally Teleprompt
tour-welcome-body = Een autocue die volledig op je eigen machine draait. Geen account, geen cloud, geen AI, geen abonnement. Dit duurt ongeveer een minuut — sla het gerust over, en je kunt het later opnieuw starten vanuit de instellingen.
tour-write-title = Schrijf je tekst
tour-write-body = Typ of plak aan de linkerkant. Open Script om er meer dan één te bewaren; alles wordt bewaard terwijl je schrijft. Twee streepjes markeren een pauze die je wilt aanhouden, en de vage suggesties vóór de cursor maken lange woorden voor je af.
tour-read-title = Bepaal je tempo
tour-read-body = Snelheid is een echt leestempo — tekens per seconde — of schakel over naar BPM als je rapt of zingt op een beat. Afspelen, pauzeren en terugspoelen staan onder de editor, of klik op een willekeurig woord in het voorbeeld om daar te beginnen. Het opgelichte woord staat altijd op de leeslijn.
tour-show-title = Laat het zien aan wie voorleest
tour-show-body = De projector zet de tekst op een tweede scherm, gespiegeld voor spiegelglas als je daardoorheen leest, of doorgestuurd naar een telefoon in je eigen netwerk. Al het andere — lettertype, kleur, marges, taal, thema — zit achter het tandwiel in de titelbalk.
settings-tour-section = Aan de slag
settings-tour-replay = Rondleiding opnieuw tonen
settings-tour-replay-note = Start de introductie in vier stappen over de editor, de tempoknoppen en de projector. De instellingen sluiten eerst, zodat je ziet waar het over gaat.

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

## Voice control (FT-31)
settings-cat-voice = Stem
settings-dictation-enabled = Mijn script schrijven door te spreken
settings-dictation-note = Druk op de opnameknop boven het script en wat je zegt wordt erin geschreven. De herkenning gebeurt op dit apparaat — geen account, geen netwerk, en niets van wat je zegt wordt ooit naar een bestand geschreven. De microfoon staat alleen open tijdens het opnemen. Wordt het script naar apparaten in je netwerk gespiegeld, dan bereiken gedicteerde woorden ze zodra ze geschreven worden — net als alles wat je typt.
settings-dictation-unavailable-model = Het spraakmodel is niet geïnstalleerd, dus dicteren kan niet werken.
settings-dictation-unavailable-build = Dicteren is niet beschikbaar in deze versie.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Maat { $bar } · { $beat }
tempo-count-in = Aftellen { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Repeteren en mijn lezing klokken
pace-behind = { $time } over tijd
pace-ahead = { $time } voor op schema
rehearsal-title = Repetitierapport
rehearsal-empty = Er is nog niets geklokt. Zet dit aan, speel het script helemaal af en zet het weer uit.
rehearsal-col-section = Onderdeel
rehearsal-col-planned = Gepland
rehearsal-col-actual = Werkelijk
rehearsal-col-delta = Verschil
rehearsal-unfinished = niet afgemaakt
rehearsal-suggest = Je las dit met ongeveer { $to } tekens per seconde, niet { $from }.
rehearsal-suggest-apply = Die snelheid gebruiken
rehearsal-close = Sluiten

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Tijdsindeling
settings-tempo-section = Tempo
settings-metronome = Een klik op het huidige tempo afspelen
settings-metronome-note = Een zachte tik op elke tel terwijl het script loopt, met accent op de eerste tel van de maat. Het aftellen bij de start wordt het intellen. De app maakt het geluid zelf — er wordt niets gedownload.
settings-beats-per-bar = Tellen per maat
settings-calibration-section = Je eigen tempo
settings-chars-per-beat = { $value } tekens per tel
settings-chars-per-beat-note = Een tempo wordt leessnelheid via één getal: hoeveel tekens je in één tel haalt. Tik mee op het tempo waarop je optreedt, dan wordt het aan je leessnelheid gemeten in plaats van geschat.
settings-tap-tempo = Tikken
settings-tap-hint = Tik drie keer of vaker
settings-tap-bpm = Getikt: { $bpm } BPM
settings-tap-apply = Dit tempo gebruiken
settings-tap-reset = Terug naar de standaard
settings-skip-section = Woorden die je niet uitvoert
settings-skip-words = Over te slaan woorden
settings-skip-words-note = Eén per regel. Een regel die alleen uit zo'n woord bestaat — Refrein, Couplet 1, Brug — kost helemaal geen tijd, zodat je tekst op de maat blijft waarvoor je hem schreef. Hetzelfde woord midden in een echte regel slaat alleen zichzelf over. Ze blijven gedimd in beeld, en het voorlezen spreekt ze nooit uit.
settings-skip-words-placeholder = Eén woord per regel

## Document import (FT-M01)
import-title = Een document importeren
import-choose = Een document kiezen...
import-hint = Word, RTF, PDF, platte tekst of Markdown.
import-filter = Documenten
import-reading = Document wordt gelezen...
import-format-txt = platte tekst
import-format-markdown = Markdown
import-format-docx = Word-document
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = { $format } gelezen: { $chars } tekens in { $paragraphs } alinea's.
import-flattened = Vet, cursief, lettertypen en kleuren zijn teruggebracht tot platte tekst.
import-truncated = Het document was langer dan een script mag zijn en is ingekort.
import-nothing-dropped = Er is verder niets weggelaten.
import-drop-encoding = Het bestand was niet als Unicode opgeslagen en is gelezen als West-Europese tekst.
import-drop-images = Weggelaten afbeeldingen: { $count }
import-drop-footnotes = Weggelaten voetnoten: { $count }
import-drop-comments = Weggelaten opmerkingen: { $count }
import-drop-headersFooters = Weggelaten kop- en voetteksten: { $count }
import-drop-linkTargets = Weggelaten linkadressen (de tekst blijft): { $count }
import-drop-objects = Weggelaten ingesloten objecten: { $count }
import-preview = De autocuetekst
import-name = Opslaan als
import-confirm = Importeren
import-cancel = Annuleren

## Find and replace (FT-M07)
find-title = Zoeken en vervangen
find-what = Zoeken
find-with = Vervangen door
find-case = Hoofdlettergevoelig
find-whole-word = Alleen hele woorden
find-count = { $at } van { $total }
find-none = Geen resultaten
find-replaced = { $count } vervangen
find-previous = Vorige
find-next = Volgende
find-replace = Vervangen
find-replace-all = Alles vervangen
find-close = Sluiten

## Section markers (FT-M05)
marker-list = Naar een sectie springen
marker-previous = Vorige sectie
marker-next = Volgende sectie
marker-none-yet = Vóór de eerste markering

## Script statistics (FT-M03)
stats-counts = { $words } woorden, { $chars } tekens
stats-long-line = Regel { $line } is erg lang ({ $chars } tekens)
