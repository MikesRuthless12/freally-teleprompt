# Freally Teleprompt — Português (Brasil) (Brazilian Portuguese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Roteiros
toolbar-projector = Abrir projetor
toolbar-settings = Configurações
toolbar-about = Sobre
toolbar-bug-report = Relatar um problema
toolbar-updates = Buscar atualizações

## Window controls (the app draws its own title bar)
window-minimize = Minimizar
window-maximize = Maximizar
window-restore = Restaurar
window-close = Fechar

## System tray
tray-show = Mostrar Freally Teleprompt
tray-quit = Sair

## About
about-version = Versão { $version }
about-tagline = Um teleprompter local para criadores, palestrantes e artistas. Um mesmo motor baseado em caracteres mantém a prévia, o projetor e o espelho de rede na mesma palavra.
about-privacy = Sem IA, sem conta, sem telemetria. Seus roteiros ficam no seu dispositivo.
about-copyright = © 2026 Mike Weaver — Havoc Software. Todos os direitos reservados.
about-website = Site
about-source = Código-fonte
about-close = Fechar

## Transport
transport-play = Reproduzir
transport-pause = Pausar
transport-stop = Parar
transport-restart = Voltar ao início
transport-rewind = Retroceder
transport-forward = Avançar
transport-slower = Mais lento
transport-faster = Mais rápido
transport-seek = Navegar pelo roteiro

## Editor
editor-label = Roteiro
editor-placeholder = Digite ou cole seu roteiro. Use " -- " para uma pausa, ou " --2 " para segurar por 2 segundos.
editor-caesura-hint = Digite -- para uma pausa
editor-est-time = Tempo de leitura { $time }
editor-speed = Velocidade (caracteres por segundo)
editor-speed-bpm = Velocidade (BPM)
editor-bpm-mode = Modo BPM (canto)
editor-read-aloud = Ler em voz alta com a síntese de fala do sistema operacional
editor-save-failed = Não foi possível salvar: { $error }

## Script library
library-title = Roteiros
library-new = Novo
library-new-placeholder = Dê um nome a um novo roteiro
library-empty = Ainda não há roteiros. Dê um nome acima para começar.
library-open = Abrir
library-current = aberto
library-rename = Renomear
library-save-name = Salvar
library-delete = Excluir
library-delete-confirm = Excluir?
library-delete-yes = Sim
library-delete-no = Não
library-close = Fechar

## Projector
projector-title = Abrir o projetor
projector-display = Tela
projector-windowed = Janela flutuante (esta tela)
projector-display-option = Tela { $n } — { $w }×{ $h }
projector-primary = (principal)
projector-fill = Preencher a tela inteira
projector-mirror = Espelhar horizontalmente (para vidro divisor)
projector-mirror-hint = Ative apenas se a leitura for pelo vidro do teleprompter, que inverte a imagem.
projector-open = Abrir
projector-cancel = Cancelar
projector-exit-hint = Pressione Esc para sair
projector-window-title = Freally Teleprompt — projetor

## Prompter surface
teleprompter-empty = Nenhum roteiro carregado ainda. Abra um em Roteiros, ou comece a digitar à esquerda.

## Settings
settings-title = Configurações
settings-search-placeholder = Pesquisar configurações…
settings-search-none = Nenhuma configuração corresponde.
settings-changed = Alterado desde a abertura
settings-ok = OK
settings-cat-general = Geral
settings-cat-editor = Editor
settings-cat-reading = Leitura
settings-cat-appearance = Aparência
settings-cat-projector = Projetor
settings-cat-network = Rede
settings-language = Idioma
settings-language-auto = Igual ao meu sistema
settings-theme = Tema
settings-theme-dark = Escuro
settings-theme-light = Claro
settings-window-section = Janela
settings-minimize-to-tray = Minimizar para a bandeja do sistema
settings-minimize-to-tray-note = O botão minimizar oculta a janela em vez de mandá-la para a barra de tarefas. Clique no ícone da bandeja para trazê-la de volta. O ícone só existe enquanto a janela está oculta: ao restaurá-la ele some.
settings-autocomplete-section = Autocompletar
settings-autocomplete = Sugerir palavras enquanto eu digito
settings-autocomplete-note = O texto sugerido aparece esmaecido à frente do cursor. Pressione Tab para aceitá-lo ou Esc para descartá-lo. As sugestões vêm de listas de palavras dentro do aplicativo — nada do que você escreve é enviado para lugar nenhum.
settings-autocomplete-language = Idioma das sugestões
settings-autocomplete-language-auto = Igual ao idioma do aplicativo
settings-lan-off-hint = O espelho está desligado. Ative-o e pressione Aplicar para obter um link e um código QR.
settings-section-reading = Leitura
settings-speed = Velocidade de leitura — { $value } caracteres por segundo
settings-font-size = Tamanho da fonte — { $value } px
settings-caesura = Pausa padrão para " -- " — { $value } segundos
settings-countdown = Contagem regressiva antes de começar — { $value } segundos
settings-section-appearance = Aparência
settings-font-family = Tipografia
settings-font-system = Do sistema
settings-font-sans = Sem serifa
settings-font-serif = Com serifa
settings-font-mono = Monoespaçada
settings-font-rounded = Arredondada
settings-font-slab = Slab
settings-font-weight = Espessura
settings-text-color = Cor do texto
settings-line-height = Entrelinha — { $value }
settings-margins = Margens laterais — { $value } %
settings-guide = Guia de leitura — { $value } % a partir do topo
settings-section-projector = Projetor
settings-mirror = Espelhar a projeção (para vidro beam splitter)
settings-section-mirror = Espelhar na minha rede
settings-lan-enabled = Espelhar o roteiro para dispositivos na minha rede
settings-lan-all-interfaces = Permitir outros dispositivos, não só este computador
settings-lan-warning = O link carrega uma chave de uso único e não é criptografado, então use apenas numa rede confiável. O espelho é somente leitura e seu roteiro nunca é enviado para lugar nenhum.
settings-lan-port = Porta
settings-lan-open = Abrir no meu navegador
settings-lan-open-hint = Escaneie o código, ou abra este link em qualquer dispositivo da mesma rede.
settings-lan-failed = Não foi possível iniciar o espelho: { $error }
mirror-qr-aria = Código QR do link do espelho
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

## Voice control (FT-31)
settings-cat-voice = Voz
settings-voice-enabled = Controlar o teleprompter com a minha voz
settings-voice-note = Os comandos são executados neste dispositivo e comparados com gravações curtas da sua própria voz. Sem modelo e sem rede — o microfone só abre durante a escuta, e nada do que você diz é salvo em um arquivo.
settings-voice-mode = Quando escutar
settings-voice-mode-ptt = Apenas enquanto eu seguro o botão
settings-voice-mode-always = Sempre, quando ativado
settings-voice-commands = Seus comandos
settings-voice-commands-note = Grave cada comando com a sua própria voz duas ou três vezes. Mais gravações deixam tudo mais estável.
settings-voice-record = Gravar
settings-voice-recording = Escutando…
settings-voice-forget = Esquecer
settings-voice-takes = { $count } gravadas
settings-voice-untrained = Não gravado
voice-cmd-next = Próxima pausa
voice-listening = Escutando
voice-hold-to-talk = Segure para falar
