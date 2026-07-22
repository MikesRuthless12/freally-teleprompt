# Freally Teleprompt — Español (Spanish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Ajustes
toolbar-bug-report = Informar de un problema
toolbar-updates = Buscar actualizaciones

## Transport
transport-play = Reproducir
transport-pause = Pausa
transport-restart = Volver al principio

## Editor
editor-label = Guion
editor-placeholder = Escribe o pega tu guion. Usa " -- " para una pausa, o " --2 " para detenerte 2 segundos.
editor-load = Cargar en el teleprompter

## Prompter surface
teleprompter-empty = Todavía no hay ningún guion cargado. Escribe uno a la izquierda y elige «Cargar en el teleprompter».

## Settings
settings-title = Ajustes
settings-language = Idioma
settings-language-auto = Igual que mi sistema
settings-theme = Tema
settings-theme-dark = Oscuro
settings-theme-light = Claro
settings-speed = Velocidad de lectura — { $value } caracteres por segundo
settings-font-size = Tamaño de fuente — { $value } px
settings-caesura = Pausa predeterminada para " -- " — { $value } segundos
settings-countdown = Cuenta atrás antes de empezar — { $value } segundos
settings-mirror = Reflejar la proyección (para cristal divisor de haz)
settings-cancel = Cancelar
settings-apply = Aplicar

## First-run agreement
eula-title = Contrato de licencia de usuario final
eula-version = Versión { $version }
eula-intro = Lee este contrato. Debes aceptarlo antes de usar Freally Teleprompt.
eula-scroll-hint = Desplázate hasta el final para continuar.
eula-thanks = Gracias por leerlo.
eula-agree = Acepto
eula-decline = Rechazar y salir

## Problem report
bug-title = Informar de un problema
bug-intro = No se envía nada automáticamente. Tú eliges cómo enviarlo y puedes leer antes el texto exacto que aparece abajo.
bug-crash-attached = La última vez, Freally Teleprompt se cerró de forma inesperada. Los detalles están adjuntos abajo.
bug-what-happened = ¿Qué ocurrió?
bug-what-happened-placeholder = ¿Qué estabas haciendo cuando ocurrió el problema?
bug-preview-label = Exactamente lo que se enviará
bug-open-github = Abrir una incidencia en GitHub
bug-compose-gmail = Redactar en Gmail
bug-send-email = Enviar por correo
bug-copy = Copiar el informe
bug-copied = Copiado
bug-dismiss-crash = Descartar el fallo
bug-close = Cerrar

## Updates
updates-title = Actualización disponible
updates-available = Freally Teleprompt { $version } ya está disponible. Tú tienes la { $current }.
updates-notes-label = Novedades
updates-yes = Sí, actualizar ahora
updates-no = No, ahora no
updates-installing = Descargando e instalando…
updates-none = Tienes la última versión.
updates-error = No se han podido buscar actualizaciones.
updates-checking = Buscando actualizaciones…

## Startup
startup-failed = No se pudo iniciar Freally Teleprompt.
