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
about-copyright = © 2026 Mike Weaver. Wszelkie prawa zastrzeżone.
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
editor-dictate = Dyktuj
editor-dictate-stop = Zakończ dyktowanie
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
settings-cat-editor = Edytor
settings-cat-reading = Czytanie
settings-cat-appearance = Wygląd
settings-cat-projector = Projektor
settings-cat-network = Sieć
settings-language = Język
settings-language-auto = Taki jak w systemie
settings-theme = Motyw
settings-theme-system = Taki jak w systemie
settings-theme-dark = Ciemny
settings-theme-light = Jasny
settings-window-section = Okno
settings-minimize-to-tray = Minimalizuj do zasobnika systemowego
settings-minimize-to-tray-note = Przycisk minimalizacji ukrywa okno zamiast wysyłać je na pasek zadań. Kliknij ikonę w zasobniku, aby je przywrócić. Ikona istnieje tylko wtedy, gdy okno jest ukryte — po przywróceniu znika.
settings-autocomplete-section = Autouzupełnianie
settings-autocomplete = Podpowiadaj słowa podczas pisania
settings-autocomplete-note = Sugerowany tekst pojawia się przygaszony przed kursorem. Naciśnij Tab, aby go przyjąć, lub Esc, aby go odrzucić. Podpowiedzi pochodzą z list słów zawartych w aplikacji — nic z tego, co piszesz, nie jest nigdzie wysyłane.
settings-autocomplete-language = Język podpowiedzi
settings-autocomplete-language-auto = Tak jak język aplikacji
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

## Onboarding tour (FT-50)
tour-step = { $n } z { $total }
tour-skip = Pomiń
tour-back = Wstecz
tour-next = Dalej
tour-done = Zacznij pisać
tour-welcome-title = Witamy w Freally Teleprompt
tour-welcome-body = Promptera, który działa w całości na twoim komputerze. Bez konta, bez chmury, bez SI, bez abonamentu. To zajmie około minuty — możesz pominąć w każdej chwili, a całość uruchomisz ponownie z ustawień.
tour-write-title = Napisz swój tekst
tour-write-body = Pisz lub wklejaj po lewej. Otwórz Skrypty, aby trzymać ich więcej niż jeden; wszystko zapisuje się na bieżąco. Dwa myślniki oznaczają pauzę, którą chcesz przytrzymać, a przygaszone podpowiedzi przed kursorem dokańczają za ciebie długie słowa.
tour-read-title = Ustal swoje tempo
tour-read-body = Prędkość to prawdziwe tempo czytania — znaki na sekundę — albo przełącz się na BPM, jeśli rapujesz lub śpiewasz do bitu. Odtwarzanie, pauza i przewijanie są pod edytorem, albo kliknij dowolne słowo w podglądzie, żeby zacząć od niego. Podświetlone słowo zawsze stoi na linii czytania.
tour-show-title = Pokaż to osobie czytającej
tour-show-body = Projektor przenosi tekst na drugi ekran, odbity dla szkła półprzepuszczalnego, jeśli czytasz przez nie, albo przesyła go na telefon w twojej własnej sieci. Cała reszta — krój pisma, kolor, marginesy, język, motyw — kryje się za kołem zębatym na pasku tytułu.
settings-tour-section = Pierwsze kroki
settings-tour-replay = Pokaż wprowadzenie ponownie
settings-tour-replay-note = Uruchamia czterostopniowe wprowadzenie do edytora, regulacji tempa i projektora. Ustawienia zamkną się najpierw, żebyś widział, o czym mowa.

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

## Voice control (FT-31)
settings-cat-voice = Głos
settings-dictation-enabled = Pisz scenariusz głosem
settings-dictation-note = Naciśnij przycisk nagrywania nad scenariuszem, a to, co powiesz, zostanie w nim zapisane. Rozpoznawanie odbywa się na tym urządzeniu — bez konta, bez sieci, i nic z tego, co mówisz, nie trafia do pliku. Mikrofon jest otwarty tylko podczas nagrywania.
settings-dictation-unavailable-model = Model mowy nie jest zainstalowany, więc dyktowanie nie zadziała.
settings-dictation-unavailable-build = Dyktowanie nie jest dostępne w tej wersji.
