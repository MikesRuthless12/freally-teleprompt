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
toolbar-about = Informazioni
toolbar-bug-report = Segnala un problema
toolbar-updates = Controlla gli aggiornamenti

## Window controls (the app draws its own title bar)
window-minimize = Riduci a icona
window-maximize = Ingrandisci
window-restore = Ripristina
window-close = Chiudi

## System tray
tray-show = Mostra Freally Teleprompt
tray-quit = Esci

## About
about-version = Versione { $version }
about-tagline = Un gobbo elettronico locale per creator, relatori e interpreti. Un unico motore basato sui caratteri tiene anteprima, proiettore e mirror di rete sulla stessa parola.
about-privacy = Niente IA, niente account, niente telemetria. I tuoi copioni restano sul tuo dispositivo.
about-copyright = © 2026 Mike Weaver — Havoc Software. Tutti i diritti riservati.
about-website = Sito web
about-source = Codice sorgente
about-close = Chiudi

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
editor-caesura-hint = Digita -- per una pausa
editor-est-time = Tempo di lettura { $time }
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
settings-search-placeholder = Cerca nelle impostazioni…
settings-search-none = Nessuna impostazione corrispondente.
settings-changed = Modificato dall'apertura
settings-ok = OK
settings-cat-general = Generale
settings-cat-editor = Editor
settings-cat-reading = Lettura
settings-cat-appearance = Aspetto
settings-cat-projector = Proiettore
settings-cat-network = Rete
settings-language = Lingua
settings-language-auto = Come il sistema
settings-theme = Tema
settings-theme-dark = Scuro
settings-theme-light = Chiaro
settings-window-section = Finestra
settings-minimize-to-tray = Riduci nell'area di notifica
settings-minimize-to-tray-note = Il pulsante Riduci a icona nasconde la finestra invece di mandarla nella barra delle applicazioni. Fai clic sull'icona nell'area di notifica per riaprirla. L'icona esiste solo finché la finestra è nascosta: ripristinandola scompare.
settings-autocomplete-section = Completamento automatico
settings-autocomplete = Suggerisci parole mentre scrivo
settings-autocomplete-note = Il testo suggerito appare in grigio davanti al cursore. Premi Tab per accettarlo o Esc per ignorarlo. I suggerimenti provengono da elenchi di parole contenuti nell'app: nulla di ciò che scrivi viene inviato da nessuna parte.
settings-autocomplete-language = Lingua dei suggerimenti
settings-autocomplete-language-auto = Come la lingua dell'app
settings-lan-off-hint = Il mirror è disattivato. Attivalo e premi Applica per ottenere un link e un codice QR.
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

## Voice control (FT-31)
settings-cat-voice = Voce
settings-voice-enabled = Controlla il teleprompter con la mia voce
settings-voice-note = I comandi vengono eseguiti su questo dispositivo e confrontati con brevi registrazioni della tua stessa voce. Nessun modello e nessuna rete — il microfono si attiva solo durante l'ascolto e nulla di ciò che dici viene mai salvato in un file.
settings-voice-mode = Quando ascoltare
settings-voice-mode-ptt = Solo mentre tengo premuto il pulsante
settings-voice-mode-always = Sempre, quando è attivo
settings-voice-commands = I tuoi comandi
settings-voice-commands-note = Registra ogni comando con la tua voce due o tre volte. Più registrazioni lo rendono più stabile.
settings-voice-record = Registra
settings-voice-recording = In ascolto…
settings-voice-forget = Dimentica
settings-voice-takes = { $count } registrate
settings-voice-untrained = Non registrato
voice-cmd-next = Pausa successiva
voice-listening = In ascolto
voice-hold-to-talk = Tieni premuto per parlare
