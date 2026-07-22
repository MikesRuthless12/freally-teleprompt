# Freally Teleprompt — Русский (Russian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Сценарии
toolbar-projector = Открыть проектор
toolbar-settings = Настройки
toolbar-about = О программе
toolbar-bug-report = Сообщить о проблеме
toolbar-updates = Проверить обновления

## Window controls (the app draws its own title bar)
window-minimize = Свернуть
window-maximize = Развернуть
window-restore = Восстановить
window-close = Закрыть

## System tray
tray-show = Показать Freally Teleprompt
tray-quit = Выход

## About
about-version = Версия { $version }
about-tagline = Локальный телесуфлёр для авторов, докладчиков и артистов. Один посимвольный движок держит предпросмотр, проектор и сетевую трансляцию на одном и том же слове.
about-privacy = Никакого ИИ, аккаунтов и телеметрии. Ваши сценарии остаются на вашем устройстве.
about-copyright = © 2026 Mike Weaver — Havoc Software. Все права защищены.
about-website = Сайт
about-source = Исходный код
about-close = Закрыть

## Transport
transport-play = Пуск
transport-pause = Пауза
transport-stop = Стоп
transport-restart = В начало
transport-rewind = Шаг назад
transport-forward = Шаг вперёд
transport-slower = Медленнее
transport-faster = Быстрее
transport-seek = Перемотка по тексту

## Editor
editor-label = Сценарий
editor-placeholder = Введите или вставьте свой сценарий. Используйте " -- " для паузы или " --2 ", чтобы остановиться на 2 секунды.
editor-caesura-hint = Введите -- для паузы
editor-est-time = Время чтения { $time }
editor-speed = Скорость (символов в секунду)
editor-speed-bpm = Скорость (BPM)
editor-bpm-mode = Режим BPM (пение)
editor-read-aloud = Читать вслух средствами синтеза речи ОС
editor-save-failed = Не удалось сохранить: { $error }

## Script library
library-title = Сценарии
library-new = Создать
library-new-placeholder = Название нового сценария
library-empty = Сценариев пока нет. Введите название выше, чтобы начать.
library-open = Открыть
library-current = открыт
library-rename = Переименовать
library-save-name = Сохранить
library-delete = Удалить
library-delete-confirm = Удалить?
library-delete-yes = Да
library-delete-no = Нет
library-close = Закрыть

## Projector
projector-title = Открыть проектор
projector-display = Дисплей
projector-windowed = Плавающее окно (этот экран)
projector-display-option = Дисплей { $n } — { $w }×{ $h }
projector-primary = (основной)
projector-fill = Занять весь экран
projector-mirror = Отразить по горизонтали (для светоделительного стекла)
projector-mirror-hint = Включайте только если текст читают через стекло суфлёра — оно переворачивает изображение.
projector-open = Открыть
projector-cancel = Отмена
projector-exit-hint = Нажмите Esc для выхода
projector-window-title = Freally Teleprompt — проектор

## Prompter surface
teleprompter-empty = Сценарий ещё не загружен. Откройте его в «Сценариях» или начните печатать слева.

## Settings
settings-title = Настройки
settings-search-placeholder = Поиск настроек…
settings-search-none = Нет подходящих настроек.
settings-changed = Изменено с момента открытия
settings-ok = ОК
settings-cat-general = Общие
settings-cat-reading = Чтение
settings-cat-appearance = Внешний вид
settings-cat-projector = Проектор
settings-cat-network = Сеть
settings-language = Язык
settings-language-auto = Как в системе
settings-theme = Тема
settings-theme-dark = Тёмная
settings-theme-light = Светлая
settings-window-section = Окно
settings-minimize-to-tray = Сворачивать в системный лоток
settings-minimize-to-tray-note = Кнопка «Свернуть» скрывает окно вместо того, чтобы отправить его на панель задач. Щёлкните значок в лотке, чтобы вернуть окно. Значок существует только пока окно скрыто — после восстановления он исчезает.
settings-lan-off-hint = Трансляция выключена. Включите её и нажмите «Применить», чтобы получить ссылку и QR-код.
settings-section-reading = Чтение
settings-speed = Скорость чтения — { $value } символов в секунду
settings-font-size = Размер шрифта — { $value } px
settings-caesura = Пауза по умолчанию для " -- " — { $value } сек.
settings-countdown = Обратный отсчёт перед стартом — { $value } сек.
settings-section-appearance = Оформление
settings-font-family = Шрифт
settings-font-system = Системный
settings-font-sans = Без засечек
settings-font-serif = С засечками
settings-font-mono = Моноширинный
settings-font-rounded = Скруглённый
settings-font-slab = Брусковый
settings-font-weight = Насыщенность
settings-text-color = Цвет текста
settings-line-height = Межстрочный интервал — { $value }
settings-margins = Боковые поля — { $value } %
settings-guide = Линия чтения — { $value } % сверху
settings-section-projector = Проектор
settings-mirror = Зеркалить изображение проектора (для светоделительного стекла)
settings-section-mirror = Трансляция в мою сеть
settings-lan-enabled = Транслировать сценарий на устройства в моей сети
settings-lan-all-interfaces = Разрешить другие устройства, а не только этот компьютер
settings-lan-warning = Ссылка содержит одноразовый ключ и не шифруется — используйте её только в сети, которой доверяете. Трансляция работает только на чтение, и ваш сценарий никуда не загружается.
settings-lan-port = Порт
settings-lan-open = Открыть в браузере
settings-lan-open-hint = Отсканируйте код или откройте эту ссылку на любом устройстве в той же сети.
settings-lan-failed = Не удалось запустить трансляцию: { $error }
mirror-qr-aria = QR-код ссылки на трансляцию
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
updates-checking = Проверка обновлений…

## Startup
startup-failed = Не удалось запустить Freally Teleprompt.
