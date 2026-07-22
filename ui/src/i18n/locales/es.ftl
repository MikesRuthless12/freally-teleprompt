# Freally Teleprompt — Español (Spanish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Guiones
toolbar-projector = Abrir proyector
toolbar-settings = Ajustes
toolbar-about = Acerca de
toolbar-bug-report = Informar de un problema
toolbar-updates = Buscar actualizaciones

## Window controls (the app draws its own title bar)
window-minimize = Minimizar
window-maximize = Maximizar
window-restore = Restaurar
window-close = Cerrar

## System tray
tray-show = Mostrar Freally Teleprompt
tray-quit = Salir

## About
about-version = Versión { $version }
about-tagline = Un teleprompter local para creadores, ponentes e intérpretes. Un mismo motor basado en caracteres mantiene la vista previa, el proyector y la copia en red sobre la misma palabra.
about-privacy = Sin IA, sin cuenta, sin telemetría. Tus guiones se quedan en tu dispositivo.
about-copyright = © 2026 Mike Weaver — Havoc Software. Todos los derechos reservados.
about-website = Sitio web
about-source = Código fuente
about-close = Cerrar

## Transport
transport-play = Reproducir
transport-pause = Pausa
transport-stop = Detener
transport-restart = Volver al principio
transport-rewind = Retroceder
transport-forward = Avanzar
transport-slower = Más lento
transport-faster = Más rápido
transport-seek = Desplazarse por el guion

## Editor
editor-label = Guion
editor-placeholder = Escribe o pega tu guion. Usa " -- " para una pausa, o " --2 " para detenerte 2 segundos.
editor-caesura-hint = Escribe -- para una pausa
editor-est-time = Tiempo de lectura { $time }
editor-speed = Velocidad (caracteres por segundo)
editor-speed-bpm = Velocidad (BPM)
editor-bpm-mode = Modo BPM (canto)
editor-read-aloud = Leer en voz alta con la síntesis de voz del sistema operativo
editor-save-failed = No se pudo guardar: { $error }

## Script library
library-title = Guiones
library-new = Nuevo
library-new-placeholder = Nombra un guion nuevo
library-empty = Todavía no hay guiones. Ponle nombre a uno arriba para empezar.
library-open = Abrir
library-current = abierto
library-rename = Renombrar
library-save-name = Guardar
library-delete = Eliminar
library-delete-confirm = ¿Eliminarlo?
library-delete-yes = Sí
library-delete-no = No
library-close = Cerrar

## Projector
projector-title = Abrir el proyector
projector-display = Pantalla
projector-windowed = Ventana flotante (esta pantalla)
projector-display-option = Pantalla { $n } — { $w }×{ $h }
projector-primary = (principal)
projector-fill = Ocupar toda la pantalla
projector-mirror = Invertir horizontalmente (para cristal divisor)
projector-mirror-hint = Actívalo solo si se lee a través del cristal del teleprompter, que invierte la imagen.
projector-open = Abrir
projector-cancel = Cancelar
projector-exit-hint = Pulsa Esc para salir
projector-window-title = Freally Teleprompt — proyector

## Prompter surface
teleprompter-empty = Aún no hay guion cargado. Abre uno desde Guiones o empieza a escribir a la izquierda.

## Settings
settings-title = Ajustes
settings-search-placeholder = Buscar ajustes…
settings-search-none = No hay ajustes que coincidan.
settings-changed = Cambiado desde que se abrió
settings-ok = Aceptar
settings-cat-general = General
settings-cat-editor = Editor
settings-cat-reading = Lectura
settings-cat-appearance = Apariencia
settings-cat-projector = Proyector
settings-cat-network = Red
settings-language = Idioma
settings-language-auto = Igual que mi sistema
settings-theme = Tema
settings-theme-dark = Oscuro
settings-theme-light = Claro
settings-window-section = Ventana
settings-minimize-to-tray = Minimizar al área de notificación
settings-minimize-to-tray-note = El botón de minimizar oculta la ventana en lugar de enviarla a la barra de tareas. Haz clic en el icono del área de notificación para recuperarla. El icono solo existe mientras la ventana está oculta: al restaurarla desaparece.
settings-autocomplete-section = Autocompletado
settings-autocomplete = Sugerir palabras mientras escribo
settings-autocomplete-note = El texto sugerido aparece atenuado delante del cursor. Pulsa Tab para aceptarlo o Esc para descartarlo. Las sugerencias proceden de listas de palabras incluidas en la aplicación: nada de lo que escribes se envía a ningún sitio.
settings-autocomplete-language = Idioma de las sugerencias
settings-autocomplete-language-auto = El mismo que la aplicación
settings-lan-off-hint = La copia está desactivada. Actívala y pulsa Aplicar para obtener un enlace y un código QR.
settings-section-reading = Lectura
settings-speed = Velocidad de lectura — { $value } caracteres por segundo
settings-font-size = Tamaño de fuente — { $value } px
settings-caesura = Pausa predeterminada para " -- " — { $value } segundos
settings-countdown = Cuenta atrás antes de empezar — { $value } segundos
settings-section-appearance = Apariencia
settings-font-family = Tipografía
settings-font-system = Del sistema
settings-font-sans = Sans-serif
settings-font-serif = Serif
settings-font-mono = Monoespaciada
settings-font-rounded = Redondeada
settings-font-slab = Slab
settings-font-weight = Grosor
settings-text-color = Color del texto
settings-line-height = Interlineado — { $value }
settings-margins = Márgenes laterales — { $value } %
settings-guide = Guía de lectura — { $value } % desde arriba
settings-section-projector = Proyector
settings-mirror = Reflejar la proyección (para cristal divisor de haz)
settings-section-mirror = Duplicar en mi red
settings-lan-enabled = Duplicar el guion en los dispositivos de mi red
settings-lan-all-interfaces = Permitir otros dispositivos, no solo este ordenador
settings-lan-warning = El enlace lleva una clave de un solo uso y no está cifrado, así que úsalo solo en una red de confianza. La copia es de solo lectura y tu guion nunca se sube a ningún sitio.
settings-lan-port = Puerto
settings-lan-open = Abrir en mi navegador
settings-lan-open-hint = Escanea el código o abre este enlace en cualquier dispositivo de la misma red.
settings-lan-failed = No se pudo iniciar la copia: { $error }
mirror-qr-aria = Código QR del enlace de la copia
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
