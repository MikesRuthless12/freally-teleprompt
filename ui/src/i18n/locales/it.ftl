# Freally Teleprompt — Italiano (Italian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Copioni
toolbar-projector = Apri proiettore
toolbar-settings = Impostazioni
toolbar-bug-report = Segnala un problema
toolbar-updates = Controlla gli aggiornamenti

## Transport
transport-play = Riproduci
transport-pause = Pausa
transport-stop = Ferma
transport-restart = Torna all'inizio
transport-rewind = Passo indietro
transport-forward = Passo avanti
transport-slower = Più lento
transport-faster = Più veloce
transport-seek = Scorri nel copione

## Editor
editor-label = Copione
editor-placeholder = Scrivi o incolla il tuo copione. Usa " -- " per una pausa, oppure " --2 " per fermarti 2 secondi.
editor-unsaved = Copione non salvato
editor-caesura-hint = Digita -- per una pausa
editor-est-time = Tempo di lettura { $time }
editor-preview = Anteprima
editor-speed = Velocità (caratteri al secondo)
editor-speed-bpm = Velocità (BPM)
editor-bpm-mode = Modalità BPM (canto)
editor-read-aloud = Leggi ad alta voce con la sintesi vocale del sistema operativo
editor-save-failed = Impossibile salvare: { $error }

## Script library
library-title = Copioni
library-new = Nuovo
library-new-placeholder = Dai un nome a un nuovo copione
library-empty = Ancora nessun copione. Dai un nome qui sopra per iniziare.
library-open = Apri
library-current = aperto
library-rename = Rinomina
library-save-name = Salva
library-delete = Elimina
library-delete-confirm = Eliminarlo?
library-delete-yes = Sì
library-delete-no = No
library-close = Chiudi

## Projector
projector-title = Apri il proiettore
projector-display = Schermo
projector-windowed = Finestra mobile (questo schermo)
projector-display-option = Schermo { $n } — { $w }×{ $h }
projector-primary = (principale)
projector-fill = Riempi tutto lo schermo
projector-mirror = Specchia orizzontalmente (per vetro semiriflettente)
projector-mirror-hint = Attivalo solo se si legge attraverso il vetro del gobbo, che inverte l'immagine.
projector-open = Apri
projector-cancel = Annulla
projector-exit-hint = Premi Esc per uscire
projector-window-title = Freally Teleprompt — proiettore

## Prompter surface
teleprompter-empty = Nessun copione caricato. Aprine uno da Copioni, oppure inizia a scrivere a sinistra.

## Settings
settings-title = Impostazioni
settings-language = Lingua
settings-language-auto = Come il sistema
settings-theme = Tema
settings-theme-dark = Scuro
settings-theme-light = Chiaro
settings-section-reading = Lettura
settings-speed = Velocità di lettura — { $value } caratteri al secondo
settings-font-size = Dimensione testo — { $value } px
settings-caesura = Pausa predefinita per " -- " — { $value } secondi
settings-countdown = Conto alla rovescia prima di iniziare — { $value } secondi
settings-section-appearance = Aspetto
settings-font-family = Carattere
settings-font-system = Di sistema
settings-font-sans = Senza grazie
settings-font-serif = Con grazie
settings-font-mono = Monospaziato
settings-font-rounded = Arrotondato
settings-font-slab = Slab
settings-font-weight = Spessore
settings-text-color = Colore del testo
settings-line-height = Interlinea — { $value }
settings-margins = Margini laterali — { $value } %
settings-guide = Guida di lettura — { $value } % dall'alto
settings-section-projector = Proiettore
settings-mirror = Rifletti l'immagine del proiettore (per vetro beam splitter)
settings-section-mirror = Rispecchia sulla mia rete
settings-lan-enabled = Rispecchia il copione sui dispositivi della mia rete
settings-lan-all-interfaces = Consenti altri dispositivi, non solo questo computer
settings-lan-warning = Il link contiene una chiave monouso e non è cifrato: usalo solo su una rete di cui ti fidi. Il mirror è di sola lettura e il tuo copione non viene mai caricato da nessuna parte.
settings-lan-port = Porta
settings-lan-open = Apri nel mio browser
settings-lan-open-hint = Scansiona il codice, oppure apri questo link su un dispositivo della stessa rete.
settings-lan-failed = Impossibile avviare il mirror: { $error }
mirror-qr-aria = Codice QR del link del mirror
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
