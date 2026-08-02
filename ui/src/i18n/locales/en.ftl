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
about-copyright = © 2026 Mike Weaver. All rights reserved.
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
editor-dictate = Dictate
editor-dictate-stop = Stop dictating
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
settings-theme-system = Same as my system
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
settings-dictation-enabled = Write my script by speaking
settings-dictation-note = Press the record button above the script and what you say is written into it. Recognised on this device — no account, no network, and nothing you say is ever saved to a file. The microphone is open only while recording.
settings-dictation-unavailable-model = The speech model isn't installed, so dictation can't run.
settings-dictation-unavailable-build = Dictation is not available in this build.

## Onboarding tour (FT-50)
tour-step = { $n } of { $total }
tour-skip = Skip
tour-back = Back
tour-next = Next
tour-done = Start writing
tour-welcome-title = Welcome to Freally Teleprompt
tour-welcome-body = A teleprompter that runs entirely on your own machine. No account, no cloud, no AI, nothing to subscribe to. This takes about a minute — press Skip any time, and you can run it again from Settings.
tour-write-title = Write your script
tour-write-body = Type or paste on the left. Open Scripts to keep more than one; everything you write is saved as you go. Type two dashes for a pause you want to hold, and let the suggestions ahead of the cursor finish long words for you.
tour-read-title = Set your pace
tour-read-body = Speed is a real reading pace — characters per second — or switch to BPM if you are rapping or singing to a beat. Play, pause and rewind under the editor, or click any word in the preview to start from there. The lit word always sits on the reading line.
tour-show-title = Show it to the talent
tour-show-body = Projector puts the script on a second screen, flipped for beam-splitter glass if you read through it, or mirrored to a phone on your own network. Everything else — typeface, colour, margins, language, theme — lives behind the gear in the title bar.
settings-tour-section = Getting started
settings-tour-replay = Show the tour again
settings-tour-replay-note = Runs the four-step introduction to the editor, the pace controls and the projector. Closing Settings first, so you can see what it points at.

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
