# Freally Teleprompt — Nederlands (Dutch).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Instellingen
toolbar-bug-report = Een probleem melden
toolbar-updates = Controleren op updates

## Transport
transport-play = Afspelen
transport-pause = Pauze
transport-restart = Terug naar het begin

## Editor
editor-label = Script
editor-placeholder = Typ of plak je script. Gebruik " -- " voor een pauze, of " --2 " om 2 seconden te wachten.
editor-load = In prompter laden

## Prompter surface
teleprompter-empty = Nog geen script geladen. Typ er links een en kies daarna "In prompter laden".

## Settings
settings-title = Instellingen
settings-language = Taal
settings-language-auto = Hetzelfde als mijn systeem
settings-theme = Thema
settings-theme-dark = Donker
settings-theme-light = Licht
settings-speed = Leessnelheid — { $value } tekens per seconde
settings-font-size = Tekengrootte — { $value } px
settings-caesura = Standaardpauze voor " -- " — { $value } seconden
settings-countdown = Aftellen voor de start — { $value } seconden
settings-mirror = Projectie spiegelen (voor beamsplitterglas)
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
