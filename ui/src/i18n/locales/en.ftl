# Freally Teleprompt — English (the source catalog).
#
# Every other locale is checked against this file by `npm run i18n:lint`: same
# keys, no duplicates, no empty values. English is layered under every bundle,
# so a locale missing a key falls back here rather than showing a raw id.
#
# One `key = value` per line. Indented continuation lines are not supported.

## App shell
app-name = Freally Teleprompt
toolbar-library = Scripts
toolbar-projector = Projector
toolbar-settings = Settings
toolbar-about = About
toolbar-bug-report = Report a problem
toolbar-updates = Check for updates

## Window controls (the app draws its own title bar)
window-minimize = Minimize
window-maximize = Maximize
window-restore = Restore
window-close = Close

## System tray
tray-show = Show Freally Teleprompt
tray-quit = Quit

## About
about-version = Version { $version }
about-tagline = A local-first teleprompter for creators, presenters and performers. One character-based engine keeps the preview, the projector and the network mirror on the same word.
about-privacy = No AI, no account, no telemetry. Your scripts stay on your device.
about-copyright = © 2026 Mike Weaver — Havoc Software. All rights reserved.
about-website = Website
about-source = Source
about-close = Close

## Transport
transport-play = Play
transport-pause = Pause
transport-stop = Stop
transport-restart = Back to top
transport-rewind = Rewind
transport-forward = Fast-forward
transport-slower = Slower
transport-faster = Faster
transport-seek = Seek through the script

## Editor
editor-label = Script
editor-placeholder = Type or paste your script. Use " -- " for a pause, or " --2 " to hold for 2 seconds.
editor-caesura-hint = Type -- for a pause
editor-est-time = Read time { $time }
editor-speed = Speed (characters per second)
editor-speed-bpm = Speed (BPM)
editor-bpm-mode = BPM mode (for singing)
editor-read-aloud = Read aloud with per-OS speech synthesis
editor-save-failed = Could not save: { $error }

## Script library
library-title = Scripts
library-new = New
library-new-placeholder = Name a new script
library-empty = No scripts yet. Name one above to begin.
library-open = Open
library-current = open
library-rename = Rename
library-save-name = Save
library-delete = Delete
library-delete-confirm = Delete it?
library-delete-yes = Yes
library-delete-no = No
library-close = Close

## Projector
projector-title = Open the projector
projector-display = Display
projector-windowed = Floating window (this screen)
projector-display-option = Display { $n } — { $w }×{ $h }
projector-primary = (primary)
projector-fill = Fill the whole display
projector-mirror = Mirror horizontally (for beam-splitter glass)
projector-mirror-hint = Turn this on only if the talent reads through prompter glass, which reverses the image.
projector-open = Open
projector-cancel = Cancel
projector-exit-hint = Press Esc to close
projector-window-title = Freally Teleprompt — projector

## Prompter surface
teleprompter-empty = No script loaded yet. Open one from Scripts, or start typing on the left.

## Settings
settings-title = Settings
settings-search-placeholder = Search settings
settings-search-none = Nothing matches that.
settings-changed = Changed, not yet applied
settings-ok = OK
settings-cat-general = General
settings-cat-editor = Editor
settings-cat-reading = Reading
settings-cat-appearance = Appearance
settings-cat-projector = Projector
settings-cat-network = Network
settings-language = Language
settings-language-auto = Same as my system
settings-theme = Theme
settings-theme-dark = Dark
settings-theme-light = Light
settings-window-section = Window
settings-minimize-to-tray = Minimize to the system tray
settings-minimize-to-tray-note = The minimize button hides the window instead of sending it to the taskbar. Click the tray icon to bring it back. The icon only exists while the window is hidden — restoring it takes the icon away again.
settings-autocomplete-section = Autocomplete
settings-autocomplete = Suggest words as I type
settings-autocomplete-note = Suggested text appears dimmed ahead of the cursor. Press Tab to accept it, or Esc to dismiss it. Suggestions come from word lists inside the app — nothing you write is ever sent anywhere.
settings-autocomplete-language = Suggestion language
settings-autocomplete-language-auto = Same as the app language
settings-lan-off-hint = The mirror is off. Turn it on and press Apply to get a link and a QR code.
settings-section-reading = Reading
settings-speed = Reading speed — { $value } characters per second
settings-font-size = Font size — { $value } px
settings-caesura = Default pause for " -- " — { $value } seconds
settings-countdown = Countdown before starting — { $value } seconds
settings-section-appearance = Appearance
settings-font-family = Typeface
settings-font-system = System
settings-font-sans = Sans-serif
settings-font-serif = Serif
settings-font-mono = Monospace
settings-font-rounded = Rounded
settings-font-slab = Slab
settings-font-weight = Weight
settings-text-color = Text colour
settings-line-height = Line spacing — { $value }
settings-margins = Side margins — { $value }%
settings-guide = Reading guide — { $value }% down the screen
settings-section-projector = Projector
settings-mirror = Mirror the projector (for beam-splitter glass)
settings-section-mirror = Mirror to my network
settings-lan-enabled = Mirror the script to devices on my network
settings-lan-all-interfaces = Allow other devices, not just this computer
settings-lan-warning = The link carries a one-time key and is not encrypted, so use this only on a network you trust. The mirror is read-only, and your script is never uploaded anywhere.
settings-lan-port = Port
settings-lan-open = Open in my browser
settings-lan-open-hint = Scan the code, or open this link on any device on the same network.
settings-lan-failed = The mirror could not start: { $error }
mirror-qr-aria = QR code for the mirror link
settings-cancel = Cancel
settings-apply = Apply

## Voice control (FT-31)
settings-cat-voice = Voice
settings-voice-enabled = Control the prompter with my voice
settings-voice-note = Commands run on this device, matched against short recordings of your own voice. No model and no network — the microphone opens only while listening, and nothing you say is ever saved to a file.
settings-voice-mode = When to listen
settings-voice-mode-ptt = Only while I hold the button
settings-voice-mode-always = Always, while enabled
settings-voice-commands = Your commands
settings-voice-commands-note = Record each command in your own voice two or three times. More recordings make it steadier.
settings-voice-record = Record
settings-voice-recording = Listening…
settings-voice-forget = Forget
settings-voice-takes = { $count } recorded
settings-voice-untrained = Not recorded
voice-cmd-next = Next pause
voice-listening = Listening
voice-hold-to-talk = Hold to talk

## First-run agreement
eula-title = End User License Agreement
eula-version = Version { $version }
eula-intro = Please read this agreement. You must accept it before using Freally Teleprompt.
eula-scroll-hint = Scroll to the end to continue.
eula-thanks = Thank you for reading.
eula-agree = I Agree
eula-decline = Decline & Quit

## Problem report
bug-title = Report a problem
bug-intro = Nothing is sent automatically. You choose how to send it, and you can read the exact text below first.
bug-crash-attached = Freally Teleprompt stopped unexpectedly last time. Details are attached below.
bug-what-happened = What happened?
bug-what-happened-placeholder = What were you doing when it went wrong?
bug-preview-label = Exactly what will be sent
bug-open-github = Open a GitHub issue
bug-compose-gmail = Compose in Gmail
bug-send-email = Send by email
bug-copy = Copy report
bug-copied = Copied
bug-dismiss-crash = Dismiss crash
bug-close = Close

## Updates
updates-title = Update available
updates-available = Freally Teleprompt { $version } is available. You have { $current }.
updates-notes-label = What's new
updates-yes = Yes, update now
updates-no = No, not now
updates-installing = Downloading and installing…
updates-none = You're up to date.
updates-error = Could not check for updates.
updates-checking = Checking for updates…

## Startup
startup-failed = Freally Teleprompt could not start.
