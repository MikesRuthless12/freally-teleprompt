# Freally Teleprompt — Polski (Polish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Ustawienia
toolbar-bug-report = Zgłoś problem
toolbar-updates = Sprawdź aktualizacje

## Transport
transport-play = Odtwórz
transport-pause = Pauza
transport-restart = Wróć na początek

## Editor
editor-label = Scenariusz
editor-placeholder = Wpisz lub wklej swój scenariusz. Użyj " -- ", aby zrobić pauzę, albo " --2 ", aby zatrzymać się na 2 sekundy.
editor-load = Wczytaj do promptera

## Prompter surface
teleprompter-empty = Nie wczytano jeszcze żadnego scenariusza. Wpisz go po lewej stronie, a potem wybierz „Wczytaj do promptera”.

## Settings
settings-title = Ustawienia
settings-language = Język
settings-language-auto = Taki jak w systemie
settings-theme = Motyw
settings-theme-dark = Ciemny
settings-theme-light = Jasny
settings-speed = Szybkość czytania — { $value } znaków na sekundę
settings-font-size = Rozmiar czcionki — { $value } px
settings-caesura = Domyślna pauza dla " -- " — { $value } sek.
settings-countdown = Odliczanie przed startem — { $value } sek.
settings-mirror = Odbij obraz projektora (do szyby półprzepuszczalnej)
settings-cancel = Anuluj
settings-apply = Zastosuj

## First-run agreement
eula-title = Umowa licencyjna użytkownika końcowego
eula-version = Wersja { $version }
eula-intro = Przeczytaj tę umowę. Musisz ją zaakceptować, zanim zaczniesz korzystać z Freally Teleprompt.
eula-scroll-hint = Przewiń do końca, aby kontynuować.
eula-thanks = Dziękujemy za przeczytanie.
eula-agree = Zgadzam się
eula-decline = Odrzuć i zakończ

## Problem report
bug-title = Zgłoś problem
bug-intro = Nic nie jest wysyłane automatycznie. To Ty wybierasz sposób wysyłki i możesz najpierw przeczytać poniżej dokładną treść.
bug-crash-attached = Freally Teleprompt zamknął się nieoczekiwanie przy ostatnim uruchomieniu. Szczegóły znajdziesz poniżej.
bug-what-happened = Co się stało?
bug-what-happened-placeholder = Co działo się tuż przed wystąpieniem problemu?
bug-preview-label = Dokładnie to, co zostanie wysłane
bug-open-github = Otwórz zgłoszenie na GitHubie
bug-compose-gmail = Utwórz w Gmailu
bug-send-email = Wyślij e-mailem
bug-copy = Kopiuj zgłoszenie
bug-copied = Skopiowano
bug-dismiss-crash = Odrzuć awarię
bug-close = Zamknij

## Updates
updates-title = Dostępna aktualizacja
updates-available = Freally Teleprompt { $version } jest już dostępny. Masz wersję { $current }.
updates-notes-label = Co nowego
updates-yes = Tak, zaktualizuj teraz
updates-no = Nie, nie teraz
updates-installing = Pobieranie i instalowanie…
updates-none = Masz najnowszą wersję.
updates-error = Nie udało się sprawdzić aktualizacji.
updates-checking = Sprawdzanie aktualizacji…

## Startup
startup-failed = Nie można uruchomić Freally Teleprompt.
