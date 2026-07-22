# Freally Teleprompt — English (the source catalog).
#
# Every other locale is checked against this file by `npm run i18n:lint`: same
# keys, no duplicates, no empty values. English is layered under every bundle,
# so a locale missing a key falls back here rather than showing a raw id.
#
# One `key = value` per line. Indented continuation lines are not supported.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Settings
toolbar-bug-report = Report a problem
toolbar-updates = Check for updates

## Transport
transport-play = Play
transport-pause = Pause
transport-restart = Back to top

## Editor
editor-label = Script
editor-placeholder = Type or paste your script. Use " -- " for a pause, or " --2 " to hold for 2 seconds.
editor-load = Load into prompter

## Prompter surface
teleprompter-empty = No script loaded yet. Type one on the left, then choose "Load into prompter".

## Settings
settings-title = Settings
settings-language = Language
settings-language-auto = Same as my system
settings-theme = Theme
settings-theme-dark = Dark
settings-theme-light = Light
settings-speed = Reading speed — { $value } characters per second
settings-font-size = Font size — { $value } px
settings-caesura = Default pause for " -- " — { $value } seconds
settings-countdown = Countdown before starting — { $value } seconds
settings-mirror = Mirror the projector (for beam-splitter glass)
settings-cancel = Cancel
settings-apply = Apply

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
