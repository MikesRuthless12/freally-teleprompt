# Freally Teleprompt — Українська (Ukrainian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Налаштування
toolbar-bug-report = Повідомити про проблему
toolbar-updates = Перевірити оновлення

## Transport
transport-play = Пуск
transport-pause = Пауза
transport-restart = На початок

## Editor
editor-label = Сценарій
editor-placeholder = Введіть або вставте свій сценарій. Використовуйте " -- " для паузи або " --2 ", щоб зупинитися на 2 секунди.
editor-load = Завантажити в телесуфлер

## Prompter surface
teleprompter-empty = Сценарій ще не завантажено. Наберіть його ліворуч, а потім виберіть «Завантажити в телесуфлер».

## Settings
settings-title = Налаштування
settings-language = Мова
settings-language-auto = Як у системі
settings-theme = Тема
settings-theme-dark = Темна
settings-theme-light = Світла
settings-speed = Швидкість читання — { $value } символів за секунду
settings-font-size = Розмір шрифту — { $value } px
settings-caesura = Типова пауза для " -- " — { $value } сек.
settings-countdown = Зворотний відлік перед стартом — { $value } сек.
settings-mirror = Дзеркалити зображення проєктора (для світлоподільного скла)
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
