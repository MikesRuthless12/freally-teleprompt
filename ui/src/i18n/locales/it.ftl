# Freally Teleprompt — Italiano (Italian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Impostazioni
toolbar-bug-report = Segnala un problema
toolbar-updates = Controlla gli aggiornamenti

## Transport
transport-play = Riproduci
transport-pause = Pausa
transport-restart = Torna all'inizio

## Editor
editor-label = Copione
editor-placeholder = Scrivi o incolla il tuo copione. Usa " -- " per una pausa, oppure " --2 " per fermarti 2 secondi.
editor-load = Carica nel prompter

## Prompter surface
teleprompter-empty = Nessun copione caricato. Scrivine uno a sinistra, poi scegli "Carica nel prompter".

## Settings
settings-title = Impostazioni
settings-language = Lingua
settings-language-auto = Come il sistema
settings-theme = Tema
settings-theme-dark = Scuro
settings-theme-light = Chiaro
settings-speed = Velocità di lettura — { $value } caratteri al secondo
settings-font-size = Dimensione testo — { $value } px
settings-caesura = Pausa predefinita per " -- " — { $value } secondi
settings-countdown = Conto alla rovescia prima di iniziare — { $value } secondi
settings-mirror = Rifletti l'immagine del proiettore (per vetro beam splitter)
settings-cancel = Annulla
settings-apply = Applica

## First-run agreement
eula-title = Contratto di licenza con l'utente finale
eula-version = Versione { $version }
eula-intro = Leggi questo contratto. Devi accettarlo prima di usare Freally Teleprompt.
eula-scroll-hint = Scorri fino alla fine per continuare.
eula-thanks = Grazie per aver letto.
eula-agree = Accetto
eula-decline = Rifiuta ed esci

## Problem report
bug-title = Segnala un problema
bug-intro = Non viene inviato nulla automaticamente. Scegli tu come inviarlo e puoi leggere prima il testo esatto qui sotto.
bug-crash-attached = L'ultima volta Freally Teleprompt si è chiuso in modo imprevisto. I dettagli sono allegati qui sotto.
bug-what-happened = Che cosa è successo?
bug-what-happened-placeholder = Che cosa stavi facendo quando si è verificato il problema?
bug-preview-label = Esattamente ciò che verrà inviato
bug-open-github = Apri una issue su GitHub
bug-compose-gmail = Componi in Gmail
bug-send-email = Invia per e-mail
bug-copy = Copia la segnalazione
bug-copied = Copiato
bug-dismiss-crash = Ignora il crash
bug-close = Chiudi

## Updates
updates-title = Aggiornamento disponibile
updates-available = Freally Teleprompt { $version } è disponibile. Tu hai la { $current }.
updates-notes-label = Novità
updates-yes = Sì, aggiorna ora
updates-no = No, non ora
updates-installing = Download e installazione in corso…
updates-none = Hai la versione più recente.
updates-error = Impossibile controllare gli aggiornamenti.
updates-checking = Ricerca di aggiornamenti…

## Startup
startup-failed = Impossibile avviare Freally Teleprompt.
