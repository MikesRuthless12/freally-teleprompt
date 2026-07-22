# Freally Teleprompt — Português (Brasil) (Brazilian Portuguese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Configurações
toolbar-bug-report = Relatar um problema
toolbar-updates = Buscar atualizações

## Transport
transport-play = Reproduzir
transport-pause = Pausar
transport-restart = Voltar ao início

## Editor
editor-label = Roteiro
editor-placeholder = Digite ou cole seu roteiro. Use " -- " para uma pausa, ou " --2 " para segurar por 2 segundos.
editor-load = Carregar no teleprompter

## Prompter surface
teleprompter-empty = Nenhum roteiro carregado ainda. Digite um à esquerda e escolha "Carregar no teleprompter".

## Settings
settings-title = Configurações
settings-language = Idioma
settings-language-auto = Igual ao meu sistema
settings-theme = Tema
settings-theme-dark = Escuro
settings-theme-light = Claro
settings-speed = Velocidade de leitura — { $value } caracteres por segundo
settings-font-size = Tamanho da fonte — { $value } px
settings-caesura = Pausa padrão para " -- " — { $value } segundos
settings-countdown = Contagem regressiva antes de começar — { $value } segundos
settings-mirror = Espelhar a projeção (para vidro beam splitter)
settings-cancel = Cancelar
settings-apply = Aplicar

## First-run agreement
eula-title = Contrato de Licença de Usuário Final
eula-version = Versão { $version }
eula-intro = Leia este contrato. Você precisa aceitá-lo antes de usar o Freally Teleprompt.
eula-scroll-hint = Role até o fim para continuar.
eula-thanks = Obrigado por ler.
eula-agree = Concordo
eula-decline = Recusar e Sair

## Problem report
bug-title = Relatar um problema
bug-intro = Nada é enviado automaticamente. Você escolhe como enviar e pode ler antes o texto exato abaixo.
bug-crash-attached = O Freally Teleprompt parou de funcionar de repente na última vez. Os detalhes estão anexados abaixo.
bug-what-happened = O que aconteceu?
bug-what-happened-placeholder = O que você estava fazendo quando deu errado?
bug-preview-label = Exatamente o que será enviado
bug-open-github = Abrir issue no GitHub
bug-compose-gmail = Compor no Gmail
bug-send-email = Enviar por e-mail
bug-copy = Copiar relatório
bug-copied = Copiado
bug-dismiss-crash = Dispensar falha
bug-close = Fechar

## Updates
updates-title = Atualização disponível
updates-available = O Freally Teleprompt { $version } está disponível. Você tem a { $current }.
updates-notes-label = Novidades
updates-yes = Sim, atualizar agora
updates-no = Não, agora não
updates-installing = Baixando e instalando…
updates-none = Você está na versão mais recente.
updates-error = Não foi possível buscar atualizações.
updates-checking = Verificando atualizações…

## Startup
startup-failed = Não foi possível iniciar o Freally Teleprompt.
