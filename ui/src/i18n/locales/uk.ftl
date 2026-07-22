# Freally Teleprompt — Українська (Ukrainian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Сценарії
toolbar-projector = Відкрити проєктор
toolbar-settings = Налаштування
toolbar-bug-report = Повідомити про проблему
toolbar-updates = Перевірити оновлення

## Transport
transport-play = Пуск
transport-pause = Пауза
transport-stop = Стоп
transport-restart = На початок
transport-rewind = Крок назад
transport-forward = Крок вперед
transport-slower = Повільніше
transport-faster = Швидше
transport-seek = Перемотування тексту

## Editor
editor-label = Сценарій
editor-placeholder = Введіть або вставте свій сценарій. Використовуйте " -- " для паузи або " --2 ", щоб зупинитися на 2 секунди.
editor-unsaved = Незбережений сценарій
editor-caesura-hint = Введіть -- для паузи
editor-est-time = Час читання { $time }
editor-preview = Перегляд
editor-speed = Швидкість (символів за секунду)
editor-speed-bpm = Швидкість (BPM)
editor-bpm-mode = Режим BPM (спів)
editor-read-aloud = Читати вголос за допомогою синтезу мовлення ОС
editor-save-failed = Не вдалося зберегти: { $error }

## Script library
library-title = Сценарії
library-new = Створити
library-new-placeholder = Назва нового сценарію
library-empty = Сценаріїв ще немає. Введіть назву вище, щоб почати.
library-open = Відкрити
library-current = відкрито
library-rename = Перейменувати
library-save-name = Зберегти
library-delete = Видалити
library-delete-confirm = Видалити?
library-delete-yes = Так
library-delete-no = Ні
library-close = Закрити

## Projector
projector-title = Відкрити проєктор
projector-display = Дисплей
projector-windowed = Плаваюче вікно (цей екран)
projector-display-option = Дисплей { $n } — { $w }×{ $h }
projector-primary = (основний)
projector-fill = Заповнити весь екран
projector-mirror = Віддзеркалити горизонтально (для світлоподільного скла)
projector-mirror-hint = Вмикайте лише якщо текст читають крізь скло суфлера — воно перевертає зображення.
projector-open = Відкрити
projector-cancel = Скасувати
projector-exit-hint = Натисніть Esc для виходу
projector-window-title = Freally Teleprompt — проєктор

## Prompter surface
teleprompter-empty = Сценарій ще не завантажено. Відкрийте його у «Сценаріях» або почніть друкувати ліворуч.

## Settings
settings-title = Налаштування
settings-language = Мова
settings-language-auto = Як у системі
settings-theme = Тема
settings-theme-dark = Темна
settings-theme-light = Світла
settings-section-reading = Читання
settings-speed = Швидкість читання — { $value } символів за секунду
settings-font-size = Розмір шрифту — { $value } px
settings-caesura = Типова пауза для " -- " — { $value } сек.
settings-countdown = Зворотний відлік перед стартом — { $value } сек.
settings-section-appearance = Вигляд
settings-font-family = Шрифт
settings-font-system = Системний
settings-font-sans = Без засічок
settings-font-serif = Із засічками
settings-font-mono = Моноширинний
settings-font-rounded = Заокруглений
settings-font-slab = Брускований
settings-font-weight = Насиченість
settings-text-color = Колір тексту
settings-line-height = Міжрядковий інтервал — { $value }
settings-margins = Бічні поля — { $value } %
settings-guide = Лінія читання — { $value } % згори
settings-section-projector = Проєктор
settings-mirror = Дзеркалити зображення проєктора (для світлоподільного скла)
settings-section-mirror = Трансляція в мою мережу
settings-lan-enabled = Транслювати сценарій на пристрої в моїй мережі
settings-lan-all-interfaces = Дозволити інші пристрої, а не лише цей комп'ютер
settings-lan-warning = Посилання містить одноразовий ключ і не шифрується — користуйтеся ним лише в мережі, якій довіряєте. Трансляція доступна тільки для перегляду, а ваш сценарій нікуди не завантажується.
settings-lan-port = Порт
settings-lan-open = Відкрити у браузері
settings-lan-open-hint = Відскануйте код або відкрийте це посилання на будь-якому пристрої в тій самій мережі.
settings-lan-failed = Не вдалося запустити трансляцію: { $error }
mirror-qr-aria = QR-код посилання на трансляцію
settings-cancel = Скасувати
settings-apply = Застосувати

## First-run agreement
eula-title = Ліцензійна угода з кінцевим користувачем
eula-version = Версія { $version }
eula-intro = Будь ласка, прочитайте цю угоду. Її потрібно прийняти, перш ніж користуватися Freally Teleprompt.
eula-scroll-hint = Прокрутіть до кінця, щоб продовжити.
eula-thanks = Дякуємо за прочитання.
eula-agree = Я погоджуюсь
eula-decline = Відхилити й вийти

## Problem report
bug-title = Повідомити про проблему
bug-intro = Нічого не надсилається автоматично. Ви самі обираєте спосіб надсилання й можете спершу прочитати точний текст нижче.
bug-crash-attached = Минулого разу Freally Teleprompt завершив роботу несподівано. Подробиці додано нижче.
bug-what-happened = Що сталося?
bug-what-happened-placeholder = Що ви робили, коли виникла проблема?
bug-preview-label = Що саме буде надіслано
bug-open-github = Відкрити issue на GitHub
bug-compose-gmail = Створити в Gmail
bug-send-email = Надіслати електронною поштою
bug-copy = Копіювати звіт
bug-copied = Скопійовано
bug-dismiss-crash = Сховати повідомлення про збій
bug-close = Закрити

## Updates
updates-title = Доступне оновлення
updates-available = Доступна версія Freally Teleprompt { $version }. У вас { $current }.
updates-notes-label = Що нового
updates-yes = Так, оновити зараз
updates-no = Ні, не зараз
updates-installing = Завантаження та встановлення…
updates-none = У вас найновіша версія.
updates-error = Не вдалося перевірити оновлення.
updates-checking = Перевірка оновлень…

## Startup
startup-failed = Не вдалося запустити Freally Teleprompt.
