# Freally Teleprompt — Русский (Russian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Настройки
toolbar-bug-report = Сообщить о проблеме
toolbar-updates = Проверить обновления

## Transport
transport-play = Пуск
transport-pause = Пауза
transport-restart = В начало

## Editor
editor-label = Сценарий
editor-placeholder = Введите или вставьте свой сценарий. Используйте " -- " для паузы или " --2 ", чтобы остановиться на 2 секунды.
editor-load = Загрузить в телесуфлёр

## Prompter surface
teleprompter-empty = Сценарий ещё не загружен. Наберите его слева, затем выберите «Загрузить в телесуфлёр».

## Settings
settings-title = Настройки
settings-language = Язык
settings-language-auto = Как в системе
settings-theme = Тема
settings-theme-dark = Тёмная
settings-theme-light = Светлая
settings-speed = Скорость чтения — { $value } символов в секунду
settings-font-size = Размер шрифта — { $value } px
settings-caesura = Пауза по умолчанию для " -- " — { $value } сек.
settings-countdown = Обратный отсчёт перед стартом — { $value } сек.
settings-mirror = Зеркалить изображение проектора (для светоделительного стекла)
settings-cancel = Отмена
settings-apply = Применить

## First-run agreement
eula-title = Лицензионное соглашение с конечным пользователем
eula-version = Версия { $version }
eula-intro = Пожалуйста, прочитайте это соглашение. Его нужно принять, прежде чем пользоваться Freally Teleprompt.
eula-scroll-hint = Прокрутите до конца, чтобы продолжить.
eula-thanks = Спасибо за прочтение.
eula-agree = Я согласен
eula-decline = Отклонить и выйти

## Problem report
bug-title = Сообщить о проблеме
bug-intro = Ничего не отправляется автоматически. Вы сами выбираете способ отправки и можете сначала прочитать точный текст ниже.
bug-crash-attached = В прошлый раз Freally Teleprompt завершил работу неожиданно. Подробности приложены ниже.
bug-what-happened = Что произошло?
bug-what-happened-placeholder = Что вы делали, когда возникла проблема?
bug-preview-label = Что именно будет отправлено
bug-open-github = Открыть issue на GitHub
bug-compose-gmail = Составить в Gmail
bug-send-email = Отправить по эл. почте
bug-copy = Копировать отчёт
bug-copied = Скопировано
bug-dismiss-crash = Скрыть сообщение о сбое
bug-close = Закрыть

## Updates
updates-title = Доступно обновление
updates-available = Доступна версия Freally Teleprompt { $version }. У вас { $current }.
updates-notes-label = Что нового
updates-yes = Да, обновить сейчас
updates-no = Нет, не сейчас
updates-installing = Загрузка и установка…
updates-none = У вас последняя версия.
updates-error = Не удалось проверить обновления.
