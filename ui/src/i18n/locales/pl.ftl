# Freally Teleprompt — Polski (Polish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Scenariusze
toolbar-projector = Otwórz projektor
toolbar-settings = Ustawienia
toolbar-about = O programie
toolbar-bug-report = Zgłoś problem
toolbar-updates = Sprawdź aktualizacje

## Window controls (the app draws its own title bar)
window-minimize = Minimalizuj
window-maximize = Maksymalizuj
window-restore = Przywróć
window-close = Zamknij

## System tray
tray-show = Pokaż Freally Teleprompt
tray-quit = Zakończ

## About
about-version = Wersja { $version }
about-tagline = Działający lokalnie prompter dla twórców, prelegentów i wykonawców. Jeden silnik oparty na znakach utrzymuje podgląd, projektor i odbicie sieciowe na tym samym słowie.
about-privacy = Bez AI, bez konta, bez telemetrii. Twoje scenariusze zostają na Twoim urządzeniu.
about-copyright = © 2026 Mike Weaver — Havoc Software. Wszelkie prawa zastrzeżone.
about-website = Strona
about-source = Kod źródłowy
about-close = Zamknij

## Transport
transport-play = Odtwórz
transport-pause = Pauza
transport-stop = Zatrzymaj
transport-restart = Wróć na początek
transport-rewind = Krok wstecz
transport-forward = Krok naprzód
transport-slower = Wolniej
transport-faster = Szybciej
transport-seek = Przewijaj scenariusz

## Editor
editor-label = Scenariusz
editor-placeholder = Wpisz lub wklej swój scenariusz. Użyj " -- ", aby zrobić pauzę, albo " --2 ", aby zatrzymać się na 2 sekundy.
editor-caesura-hint = Wpisz --, aby dodać pauzę
editor-est-time = Czas czytania { $time }
editor-speed = Tempo (znaki na sekundę)
editor-speed-bpm = Prędkość (BPM)
editor-bpm-mode = Tryb BPM (śpiew)
editor-read-aloud = Czytaj na głos, używając syntezy mowy systemu
editor-save-failed = Nie udało się zapisać: { $error }

## Script library
library-title = Scenariusze
library-new = Nowy
library-new-placeholder = Nazwij nowy scenariusz
library-empty = Nie ma jeszcze scenariuszy. Nazwij pierwszy powyżej, aby zacząć.
library-open = Otwórz
library-current = otwarty
library-rename = Zmień nazwę
library-save-name = Zapisz
library-delete = Usuń
library-delete-confirm = Usunąć?
library-delete-yes = Tak
library-delete-no = Nie
library-close = Zamknij

## Projector
projector-title = Otwórz projektor
projector-display = Ekran
projector-windowed = Pływające okno (ten ekran)
projector-display-option = Ekran { $n } — { $w }×{ $h }
projector-primary = (główny)
projector-fill = Wypełnij cały ekran
projector-mirror = Odbij w poziomie (do szkła półprzepuszczalnego)
projector-mirror-hint = Włącz tylko wtedy, gdy tekst czytany jest przez szkło promptera, które odwraca obraz.
projector-open = Otwórz
projector-cancel = Anuluj
projector-exit-hint = Naciśnij Esc, aby wyjść
projector-window-title = Freally Teleprompt — projektor

## Prompter surface
teleprompter-empty = Nie wczytano jeszcze scenariusza. Otwórz go w Scenariuszach albo zacznij pisać po lewej.

## Settings
settings-title = Ustawienia
settings-search-placeholder = Szukaj ustawień…
settings-search-none = Brak pasujących ustawień.
settings-changed = Zmienione od otwarcia
settings-ok = OK
settings-cat-general = Ogólne
settings-cat-reading = Czytanie
settings-cat-appearance = Wygląd
settings-cat-projector = Projektor
settings-cat-network = Sieć
settings-language = Język
settings-language-auto = Taki jak w systemie
settings-theme = Motyw
settings-theme-dark = Ciemny
settings-theme-light = Jasny
settings-window-section = Okno
settings-minimize-to-tray = Minimalizuj do zasobnika systemowego
settings-minimize-to-tray-note = Przycisk minimalizacji ukrywa okno zamiast wysyłać je na pasek zadań. Kliknij ikonę w zasobniku, aby je przywrócić. Ikona istnieje tylko wtedy, gdy okno jest ukryte — po przywróceniu znika.
settings-lan-off-hint = Odbicie jest wyłączone. Włącz je i naciśnij Zastosuj, aby otrzymać odnośnik i kod QR.
settings-section-reading = Czytanie
settings-speed = Szybkość czytania — { $value } znaków na sekundę
settings-font-size = Rozmiar czcionki — { $value } px
settings-caesura = Domyślna pauza dla " -- " — { $value } sek.
settings-countdown = Odliczanie przed startem — { $value } sek.
settings-section-appearance = Wygląd
settings-font-family = Krój pisma
settings-font-system = Systemowy
settings-font-sans = Bezszeryfowy
settings-font-serif = Szeryfowy
settings-font-mono = O stałej szerokości
settings-font-rounded = Zaokrąglony
settings-font-slab = Szeryfowy blokowy
settings-font-weight = Grubość
settings-text-color = Kolor tekstu
settings-line-height = Interlinia — { $value }
settings-margins = Marginesy boczne — { $value } %
settings-guide = Linia czytania — { $value } % od góry
settings-section-projector = Projektor
settings-mirror = Odbij obraz projektora (do szyby półprzepuszczalnej)
settings-section-mirror = Odbicie w mojej sieci
settings-lan-enabled = Odbijaj scenariusz na urządzenia w mojej sieci
settings-lan-all-interfaces = Zezwól innym urządzeniom, nie tylko temu komputerowi
settings-lan-warning = Odnośnik zawiera jednorazowy klucz i nie jest szyfrowany — używaj go tylko w zaufanej sieci. Odbicie jest tylko do odczytu, a Twój scenariusz nigdy nigdzie nie jest wysyłany.
settings-lan-port = Port
settings-lan-open = Otwórz w przeglądarce
settings-lan-open-hint = Zeskanuj kod albo otwórz ten odnośnik na dowolnym urządzeniu w tej samej sieci.
settings-lan-failed = Nie udało się uruchomić odbicia: { $error }
mirror-qr-aria = Kod QR z odnośnikiem do odbicia
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
