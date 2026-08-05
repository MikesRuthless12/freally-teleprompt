# Freally Teleprompt — Italiano (Italian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Copioni
toolbar-import = Importa
toolbar-find = Trova
toolbar-shortcuts = Scorciatoie
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
about-copyright = © 2026 Mike Weaver. Tutti i diritti riservati.
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
editor-dictate = Detta
editor-dictate-stop = Interrompi dettatura
editor-dictate-hint = Premi registra per iniziare a dettare
editor-dictate-hint-stop = Premi ferma per interrompere la dettatura
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
settings-theme-system = Come il sistema
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

## Onboarding tour (FT-50)
tour-step = { $n } di { $total }
tour-skip = Salta
tour-back = Indietro
tour-next = Avanti
tour-done = Inizia a scrivere
tour-welcome-title = Benvenuto in Freally Teleprompt
tour-welcome-body = Un gobbo elettronico che gira interamente sul tuo computer. Nessun account, nessun cloud, nessuna IA, nessun abbonamento. Ci vuole circa un minuto: puoi saltare quando vuoi e rivederlo dalle impostazioni.
tour-write-title = Scrivi il tuo copione
tour-write-body = Scrivi o incolla a sinistra. Apri Copioni per tenerne più di uno; tutto viene salvato mentre lavori. Due trattini segnano una pausa da tenere, e i suggerimenti sbiaditi davanti al cursore completano per te le parole lunghe.
tour-read-title = Imposta il tuo ritmo
tour-read-body = La velocità è un vero ritmo di lettura — caratteri al secondo — oppure passa ai BPM se rappi o canti su una base. Riproduci, metti in pausa e riavvolgi sotto l'editor, o fai clic su una parola qualsiasi nell'anteprima per partire da lì. La parola accesa resta sempre sulla linea di lettura.
tour-show-title = Mostralo a chi legge
tour-show-body = Il proiettore porta il copione su un secondo schermo, ribaltato per il vetro semiriflettente se leggi attraverso di esso, oppure replicato su un telefono nella tua rete. Tutto il resto — carattere, colore, margini, lingua, tema — sta dietro l'ingranaggio nella barra del titolo.
settings-tour-section = Per iniziare
settings-tour-replay = Rivedi la presentazione
settings-tour-replay-note = Riavvia l'introduzione in quattro passi all'editor, ai comandi del ritmo e al proiettore. Le impostazioni si chiudono prima, così vedi di cosa parla.

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
settings-dictation-enabled = Scrivere il copione parlando
settings-dictation-note = Premi il pulsante di registrazione sopra il copione e ciò che dici viene scritto al suo interno. Il riconoscimento avviene su questo dispositivo: nessun account, nessuna rete e nulla di ciò che dici viene mai salvato in un file. Il microfono è aperto solo durante la registrazione. Se il copione è rispecchiato sui dispositivi della tua rete, le parole dettate vi arrivano mentre vengono scritte, esattamente come tutto ciò che digiti.
settings-dictation-unavailable-model = Il modello vocale non è installato, quindi la dettatura non può funzionare.
settings-dictation-unavailable-build = La dettatura non è disponibile in questa versione.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Battuta { $bar } · { $beat }
tempo-count-in = Conteggio { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Prova e cronometra la mia lettura
pace-behind = { $time } oltre il tempo
pace-ahead = { $time } in anticipo
rehearsal-title = Rapporto di prova
rehearsal-empty = Non è ancora stato cronometrato nulla. Attivalo, riproduci il copione fino in fondo, poi disattivalo.
rehearsal-col-section = Sezione
rehearsal-col-planned = Previsto
rehearsal-col-actual = Effettivo
rehearsal-col-delta = Differenza
rehearsal-unfinished = non completata
rehearsal-suggest = L'hai letto a circa { $to } caratteri al secondo, non { $from }.
rehearsal-suggest-apply = Usa quella velocità
rehearsal-close = Chiudi

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Tempistica
settings-tempo-section = Tempo
settings-metronome = Riprodurre un clic al tempo attuale
settings-metronome-note = Un tic discreto su ogni movimento mentre il copione scorre, accentato sul primo della battuta. Il conto alla rovescia iniziale diventa il suo conteggio. L'app genera il suono da sé — non si scarica nulla.
settings-beats-per-bar = Movimenti per battuta
settings-calibration-section = Il tuo tempo
settings-chars-per-beat = { $value } caratteri per movimento
settings-chars-per-beat-note = Un tempo diventa velocità di lettura tramite un solo numero: quanti caratteri percorri in un movimento. Batti al tempo con cui interpreti e verrà misurato sulla tua velocità di lettura invece che supposto.
settings-tap-tempo = Batti
settings-tap-hint = Batti almeno tre volte
settings-tap-bpm = Battuto: { $bpm } BPM
settings-tap-apply = Usa questo tempo
settings-tap-reset = Torna al valore predefinito
settings-skip-section = Parole che non interpreti
settings-skip-words = Parole da saltare
settings-skip-words-note = Una per riga. Una riga composta solo da una di queste — Ritornello, Strofa 1, Bridge — non costa alcun tempo, così il testo resta sulla battuta per cui l'hai scritto. La stessa parola dentro una riga vera salta solo se stessa. Restano a schermo, attenuate, e la lettura ad alta voce non le pronuncia mai.
settings-skip-words-placeholder = Una parola per riga

## Document import (FT-M01)
import-title = Importa un documento
import-choose = Scegli un documento...
import-hint = Word, RTF, PDF, testo semplice o Markdown.
import-filter = Documenti
import-reading = Lettura del documento...
import-format-txt = testo semplice
import-format-markdown = Markdown
import-format-docx = documento Word
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = Letto { $format }: { $chars } caratteri in { $paragraphs } paragrafi.
import-flattened = Grassetto, corsivo, caratteri e colori sono stati ridotti a testo semplice.
import-truncated = Il documento era più lungo di quanto possa essere un copione ed è stato troncato.
import-nothing-dropped = Non è andato perso nient'altro.
import-not-itemised = Il contenuto di un PDF non può essere elencato: confronta il testo con l'originale.
import-drop-encoding = Il file non era salvato in Unicode: è stato letto come testo dell'Europa occidentale.
import-drop-images = Immagini escluse: { $count }
import-drop-footnotes = Note a piè di pagina escluse: { $count }
import-drop-comments = Commenti esclusi: { $count }
import-drop-headersFooters = Intestazioni e piè di pagina esclusi: { $count }
import-drop-linkTargets = Indirizzi dei collegamenti esclusi (il testo resta): { $count }
import-drop-objects = Oggetti incorporati esclusi: { $count }
import-preview = Il testo del gobbo
import-name = Salva come
import-confirm = Importa
import-cancel = Annulla

## Find and replace (FT-M07)
find-title = Trova e sostituisci
find-what = Trova
find-with = Sostituisci con
find-case = Maiuscole/minuscole
find-whole-word = Solo parole intere
find-count = { $at } di { $total }
find-none = Nessun risultato
find-replaced = Sostituiti: { $count }
find-previous = Precedente
find-next = Successivo
find-replace = Sostituisci
find-replace-all = Sostituisci tutto
find-close = Chiudi

## Scorciatoie, pedaliere e scorciatoie globali (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = Scorciatoie e pedaliere
shortcuts-intro = Premi un'assegnazione per cambiarla, poi premi il tasto, il telecomando o il pedale che vuoi. Le scorciatoie «Nell'app» funzionano quando Freally Teleprompt è in primo piano; quelle «Ovunque» funzionano dovunque ti trovi.
shortcuts-search = Cerca comandi e tasti
shortcuts-command = Comando
shortcuts-in-app = Nell'app
shortcuts-global = Ovunque
shortcuts-window-only = Solo nell'app
shortcuts-no-matches = Nessun comando corrisponde.
shortcuts-listening = Premi un tasto per { $command }, o Esc per annullare
shortcuts-listening-short = Premi un tasto…
shortcuts-rebind = Cambia l'assegnazione di { $command }
shortcuts-clear = Cancella l'assegnazione di { $command }
shortcuts-conflict = Assegnato anche a { $others }
shortcuts-not-registered = Un altro programma sta usando questo tasto ({ $reason })
shortcuts-wayland = Wayland non consente alle applicazioni di riservare tasti a livello di sistema, quindi le assegnazioni «Ovunque» potrebbero non funzionare in questa sessione.
shortcuts-reset = Ripristina i valori predefiniti
shortcuts-cancel = Annulla
shortcuts-apply = Applica
cmd-play-pause = Riproduci / pausa
cmd-stop = Arresta
cmd-top = Torna all'inizio
cmd-faster = Accelera
cmd-slower = Rallenta
cmd-step-back = Indietro di un passo
cmd-step-forward = Avanti di un passo
cmd-next-marker = Sezione successiva
cmd-prev-marker = Sezione precedente
cmd-find = Trova e sostituisci

## Section markers (FT-M05)
marker-list = Vai a una sezione
marker-previous = Sezione precedente
marker-next = Sezione successiva
marker-none-yet = Prima del primo segnaposto

## Script statistics (FT-M03)
stats-counts = { $words } parole, { $chars } caratteri
stats-long-line = La riga { $line } è molto lunga ({ $chars } caratteri)
