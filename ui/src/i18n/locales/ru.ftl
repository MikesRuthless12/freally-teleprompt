# Freally Teleprompt — Русский (Russian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Сценарии
toolbar-import = Импорт
toolbar-find = Поиск
toolbar-shortcuts = Горячие клавиши
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
about-copyright = © 2026 Mike Weaver. Все права защищены.
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
editor-dictate = Диктовать
editor-dictate-stop = Остановить диктовку
editor-dictate-hint = Нажмите запись, чтобы начать диктовку
editor-dictate-hint-stop = Нажмите стоп, чтобы завершить диктовку
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
settings-cat-editor = Редактор
settings-cat-reading = Чтение
settings-cat-appearance = Внешний вид
settings-cat-projector = Проектор
settings-cat-network = Сеть
settings-language = Язык
settings-language-auto = Как в системе
settings-theme = Тема
settings-theme-system = Как в системе
settings-theme-dark = Тёмная
settings-theme-light = Светлая
settings-window-section = Окно
settings-minimize-to-tray = Сворачивать в системный лоток
settings-minimize-to-tray-note = Кнопка «Свернуть» скрывает окно вместо того, чтобы отправить его на панель задач. Щёлкните значок в лотке, чтобы вернуть окно. Значок существует только пока окно скрыто — после восстановления он исчезает.
settings-autocomplete-section = Автодополнение
settings-autocomplete = Предлагать слова при вводе
settings-autocomplete-note = Предлагаемый текст отображается приглушённым перед курсором. Нажмите Tab, чтобы принять его, или Esc, чтобы отклонить. Подсказки берутся из списков слов внутри приложения — ничего из написанного вами никуда не отправляется.
settings-autocomplete-language = Язык подсказок
settings-autocomplete-language-auto = Как язык приложения
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

## Onboarding tour (FT-50)
tour-step = { $n } из { $total }
tour-skip = Пропустить
tour-back = Назад
tour-next = Далее
tour-done = Начать писать
tour-welcome-title = Добро пожаловать в Freally Teleprompt
tour-welcome-body = Телесуфлёр, который работает целиком на вашем компьютере. Без учётной записи, без облака, без ИИ, без подписки. Это займёт около минуты — нажмите «Пропустить» в любой момент, а повторить можно из настроек.
tour-write-title = Напишите текст
tour-write-body = Печатайте или вставляйте слева. Откройте «Тексты», чтобы держать несколько; всё сохраняется по ходу работы. Два дефиса отмечают паузу, которую вы хотите выдержать, а бледные подсказки перед курсором дописывают длинные слова за вас.
tour-read-title = Задайте темп
tour-read-body = Скорость — это настоящий темп чтения, символы в секунду, или переключитесь на BPM, если читаете рэп или поёте под бит. Воспроизведение, пауза и перемотка находятся под редактором, либо щёлкните любое слово в предпросмотре, чтобы начать с него. Подсвеченное слово всегда стоит на линии чтения.
tour-show-title = Покажите тому, кто читает
tour-show-body = Проектор выводит текст на второй экран, отражённым для полупрозрачного стекла, если вы читаете сквозь него, либо транслирует его на телефон в вашей собственной сети. Всё остальное — шрифт, цвет, поля, язык, тема — находится за шестерёнкой в заголовке окна.
settings-tour-section = С чего начать
settings-tour-replay = Показать знакомство ещё раз
settings-tour-replay-note = Запускает знакомство из четырёх шагов: редактор, управление темпом и проектор. Настройки сначала закроются, чтобы вы видели, о чём идёт речь.

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

## Voice control (FT-31)
settings-cat-voice = Голос
settings-dictation-enabled = Писать сценарий голосом
settings-dictation-note = Нажмите кнопку записи над сценарием, и сказанное будет записано в него. Распознавание выполняется на этом устройстве — без учётной записи, без сети, и ничего из сказанного не сохраняется в файл. Микрофон открыт только во время записи. Если сценарий транслируется на устройства в вашей сети, продиктованные слова попадают туда сразу после записи — так же, как всё, что вы набираете.
settings-dictation-unavailable-model = Речевая модель не установлена, поэтому диктовка не работает.
settings-dictation-unavailable-build = Диктовка недоступна в этой сборке.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Такт { $bar } · { $beat }
tempo-count-in = Отсчёт { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Репетировать и замерять моё чтение
pace-behind = Отставание на { $time }
pace-ahead = Опережение на { $time }
rehearsal-title = Отчёт о репетиции
rehearsal-empty = Пока ничего не замерено. Включите это, прогоните сценарий целиком, затем выключите.
rehearsal-col-section = Фрагмент
rehearsal-col-planned = План
rehearsal-col-actual = Факт
rehearsal-col-delta = Разница
rehearsal-unfinished = не закончен
rehearsal-suggest = Вы прочитали это примерно на { $to } символах в секунду, а не на { $from }.
rehearsal-suggest-apply = Взять эту скорость
rehearsal-close = Закрыть

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Тайминг
settings-tempo-section = Темп
settings-metronome = Щелчок в текущем темпе
settings-metronome-note = Тихий щелчок на каждую долю, пока идёт прокрутка, с акцентом на первой доле такта. Обратный отсчёт перед стартом становится вступительным отсчётом. Звук создаёт само приложение — ничего не скачивается.
settings-beats-per-bar = Долей в такте
settings-calibration-section = Ваш собственный темп
settings-chars-per-beat = { $value } символов на долю
settings-chars-per-beat-note = Темп превращается в скорость чтения через одно число: сколько символов вы проходите за долю. Отстучите темп, в котором выступаете, и оно будет измерено по вашей скорости чтения, а не взято наугад.
settings-tap-tempo = Отстучать
settings-tap-hint = Отстучите три раза или больше
settings-tap-bpm = Отстучано: { $bpm } BPM
settings-tap-apply = Взять этот темп
settings-tap-reset = Вернуть по умолчанию
settings-skip-section = Слова, которые вы не исполняете
settings-skip-words = Пропускаемые слова
settings-skip-words-note = По одному в строке. Строка, состоящая только из такого слова — Припев, Куплет 1, Бридж — не стоит никакого времени, поэтому текст остаётся на том такте, для которого написан. То же слово внутри настоящей строки пропускает только себя. Они остаются на экране приглушёнными, и чтение вслух их никогда не произносит.
settings-skip-words-placeholder = По одному слову в строке

## Document import (FT-M01)
import-title = Импорт документа
import-choose = Выбрать документ...
import-hint = Word, RTF, PDF, обычный текст или Markdown.
import-filter = Документы
import-reading = Чтение документа...
import-format-txt = обычный текст
import-format-markdown = Markdown
import-format-docx = документ Word
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = Прочитано ({ $format }): { $chars } символов в { $paragraphs } абзацах.
import-flattened = Полужирный, курсив, шрифты и цвета сведены к простому тексту.
import-truncated = Документ оказался длиннее допустимого для сценария и был обрезан.
import-nothing-dropped = Больше ничего не потеряно.
import-not-itemised = Содержимое PDF нельзя перечислить - сравните текст с оригиналом.
import-drop-encoding = Файл сохранён не в Unicode; он прочитан как западноевропейский текст.
import-drop-images = Пропущено изображений: { $count }
import-drop-footnotes = Пропущено сносок: { $count }
import-drop-comments = Пропущено примечаний: { $count }
import-drop-headersFooters = Пропущено колонтитулов: { $count }
import-drop-linkTargets = Пропущено адресов ссылок (текст сохранён): { $count }
import-drop-objects = Пропущено встроенных объектов: { $count }
import-preview = Текст для суфлёра
import-name = Сохранить как
import-confirm = Импортировать
import-cancel = Отмена

## Find and replace (FT-M07)
find-title = Поиск и замена
find-what = Найти
find-with = Заменить на
find-case = Учитывать регистр
find-whole-word = Только слова целиком
find-count = { $at } из { $total }
find-none = Совпадений нет
find-replaced = Заменено: { $count }
find-previous = Назад
find-next = Далее
find-replace = Заменить
find-replace-all = Заменить все
find-close = Закрыть

## Горячие клавиши, педали и глобальные сочетания (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = Горячие клавиши и педали
shortcuts-intro = Нажмите на назначение, чтобы изменить его, затем нажмите нужную клавишу, кнопку пульта или педали. Сочетания «В приложении» работают, пока Freally Teleprompt на переднем плане; «Везде» работают, где бы вы ни находились.
shortcuts-search = Поиск команд и клавиш
shortcuts-command = Команда
shortcuts-in-app = В приложении
shortcuts-global = Везде
shortcuts-window-only = Только в приложении
shortcuts-no-matches = Подходящих команд нет.
shortcuts-listening = Нажмите клавишу для «{ $command }» или Esc для отмены
shortcuts-listening-short = Нажмите клавишу…
shortcuts-rebind = Изменить назначение для «{ $command }»
shortcuts-clear = Очистить назначение для «{ $command }»
shortcuts-conflict = Также назначено: { $others }
shortcuts-not-registered = Эту клавишу использует другая программа ({ $reason })
shortcuts-wayland = Wayland не позволяет приложениям занимать клавиши на уровне системы, поэтому назначения «Везде» в этом сеансе могут не работать.
shortcuts-reset = Восстановить по умолчанию
shortcuts-cancel = Отмена
shortcuts-apply = Применить
cmd-play-pause = Воспроизведение / пауза
cmd-stop = Стоп
cmd-top = В начало
cmd-faster = Быстрее
cmd-slower = Медленнее
cmd-step-back = Шаг назад
cmd-step-forward = Шаг вперёд
cmd-next-marker = Следующий раздел
cmd-prev-marker = Предыдущий раздел
cmd-find = Найти и заменить

## Section markers (FT-M05)
marker-list = Перейти к разделу
marker-previous = Предыдущий раздел
marker-next = Следующий раздел
marker-none-yet = До первой метки

## Script statistics (FT-M03)
stats-counts = Слов: { $words }, символов: { $chars }
stats-long-line = Строка { $line } очень длинная ({ $chars } символов)
