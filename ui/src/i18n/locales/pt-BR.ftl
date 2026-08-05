# Freally Teleprompt — Português (Brasil) (Brazilian Portuguese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Roteiros
toolbar-import = Importar
toolbar-find = Localizar
toolbar-shortcuts = Atalhos
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
about-copyright = © 2026 Mike Weaver. Todos os direitos reservados.
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
editor-dictate = Ditar
editor-dictate-stop = Parar de ditar
editor-dictate-hint = Pressione gravar para começar a ditar
editor-dictate-hint-stop = Pressione parar para encerrar o ditado
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
settings-theme-system = Igual ao meu sistema
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

## Onboarding tour (FT-50)
tour-step = { $n } de { $total }
tour-skip = Pular
tour-back = Voltar
tour-next = Avançar
tour-done = Começar a escrever
tour-welcome-title = Boas-vindas ao Freally Teleprompt
tour-welcome-body = Um teleprompter que roda inteiramente na sua própria máquina. Sem conta, sem nuvem, sem IA, sem assinatura. Leva cerca de um minuto — toque em Pular quando quiser, e você pode rever isto nas configurações.
tour-write-title = Escreva seu roteiro
tour-write-body = Digite ou cole à esquerda. Abra Roteiros para guardar mais de um; tudo é salvo enquanto você escreve. Dois hifens marcam uma pausa que você quer segurar, e as sugestões esmaecidas à frente do cursor terminam as palavras longas por você.
tour-read-title = Defina seu ritmo
tour-read-body = A velocidade é um ritmo de leitura real — caracteres por segundo — ou mude para BPM se estiver cantando ou fazendo rap sobre uma batida. Reproduzir, pausar e voltar ficam abaixo do editor, ou clique em qualquer palavra na prévia para começar dali. A palavra acesa fica sempre sobre a linha de leitura.
tour-show-title = Mostre para quem vai ler
tour-show-body = O projetor leva o roteiro para uma segunda tela, espelhado para vidro semitransparente se você lê através dele, ou replicado num celular da sua própria rede. Todo o resto — fonte, cor, margens, idioma, tema — fica atrás da engrenagem na barra de título.
settings-tour-section = Primeiros passos
settings-tour-replay = Ver a introdução de novo
settings-tour-replay-note = Repete a apresentação em quatro passos do editor, dos controles de ritmo e do projetor. As configurações fecham primeiro, para você ver do que ela fala.

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
settings-dictation-enabled = Escrever meu roteiro falando
settings-dictation-note = Pressione o botão de gravar acima do roteiro e o que você disser será escrito nele. O reconhecimento acontece neste dispositivo — sem conta, sem rede, e nada do que você diz é salvo em arquivo. O microfone fica aberto apenas durante a gravação. Se o roteiro estiver sendo espelhado para dispositivos na sua rede, as palavras ditadas chegam a eles conforme são escritas — igual a tudo o que você digita.
settings-dictation-unavailable-model = O modelo de fala não está instalado, então o ditado não pode funcionar.
settings-dictation-unavailable-build = O ditado não está disponível nesta versão.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Compasso { $bar } · { $beat }
tempo-count-in = Contagem { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Ensaiar e cronometrar minha leitura
pace-behind = { $time } além do tempo
pace-ahead = { $time } adiantado
rehearsal-title = Relatório de ensaio
rehearsal-empty = Nada foi cronometrado ainda. Ative isto, reproduza o roteiro inteiro e desative de novo.
rehearsal-col-section = Trecho
rehearsal-col-planned = Previsto
rehearsal-col-actual = Real
rehearsal-col-delta = Diferença
rehearsal-unfinished = não concluído
rehearsal-suggest = Você leu isto a cerca de { $to } caracteres por segundo, não { $from }.
rehearsal-suggest-apply = Usar essa velocidade
rehearsal-close = Fechar

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Cronometragem
settings-tempo-section = Andamento
settings-metronome = Tocar um clique no andamento atual
settings-metronome-note = Um tique discreto a cada tempo enquanto o roteiro rola, acentuado no primeiro tempo do compasso. A contagem regressiva inicial vira a contagem de entrada. O app gera o som — nada é baixado.
settings-beats-per-bar = Tempos por compasso
settings-calibration-section = Seu próprio andamento
settings-chars-per-beat = { $value } caracteres por tempo
settings-chars-per-beat-note = Um andamento vira velocidade de leitura por um único número: quantos caracteres você percorre em um tempo. Marque no andamento em que você canta e ele será medido pela sua velocidade de leitura em vez de suposto.
settings-tap-tempo = Marcar
settings-tap-hint = Marque três vezes ou mais
settings-tap-bpm = Marcado: { $bpm } BPM
settings-tap-apply = Usar este andamento
settings-tap-reset = Voltar ao padrão
settings-skip-section = Palavras que você não canta
settings-skip-words = Palavras a pular
settings-skip-words-note = Uma por linha. Uma linha que seja apenas uma delas — Refrão, Verso 1, Ponte — não custa tempo algum, então sua letra continua caindo no compasso para o qual você a escreveu. A mesma palavra dentro de uma linha de verdade pula apenas ela mesma. Elas continuam na tela, esmaecidas, e a leitura em voz alta nunca as pronuncia.
settings-skip-words-placeholder = Uma palavra por linha

## Document import (FT-M01)
import-title = Importar um documento
import-choose = Escolher um documento...
import-hint = Word, RTF, PDF, texto simples ou Markdown.
import-filter = Documentos
import-reading = Lendo o documento...
import-format-txt = texto simples
import-format-markdown = Markdown
import-format-docx = documento do Word
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = { $format } lido: { $chars } caracteres em { $paragraphs } parágrafos.
import-flattened = Negrito, itálico, fontes e cores foram reduzidos a texto simples.
import-truncated = O documento era mais longo do que um roteiro pode ser e foi cortado.
import-nothing-dropped = Nada mais ficou de fora.
import-not-itemised = O conteúdo de um PDF não pode ser listado - compare o texto com o original.
import-drop-encoding = O arquivo não estava salvo em Unicode; foi lido como texto da Europa Ocidental.
import-drop-images = Imagens deixadas de fora: { $count }
import-drop-footnotes = Notas de rodapé deixadas de fora: { $count }
import-drop-comments = Comentários deixados de fora: { $count }
import-drop-headersFooters = Cabeçalhos e rodapés deixados de fora: { $count }
import-drop-linkTargets = Endereços dos links deixados de fora (o texto permanece): { $count }
import-drop-objects = Objetos incorporados deixados de fora: { $count }
import-preview = O texto do teleprompter
import-name = Salvar como
import-confirm = Importar
import-cancel = Cancelar

## Find and replace (FT-M07)
find-title = Localizar e substituir
find-what = Localizar
find-with = Substituir por
find-case = Diferenciar maiúsculas
find-whole-word = Somente palavras inteiras
find-count = { $at } de { $total }
find-none = Nenhuma ocorrência
find-replaced = { $count } substituídas
find-previous = Anterior
find-next = Próxima
find-replace = Substituir
find-replace-all = Substituir tudo
find-close = Fechar

## Atalhos, pedais e atalhos globais (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = Atalhos e pedais
shortcuts-intro = Clique em uma atribuição para alterá-la e depois pressione a tecla, o controle remoto ou o pedal que quiser. Os atalhos «No aplicativo» funcionam enquanto o Freally Teleprompt está em primeiro plano; os «Em qualquer lugar» funcionam onde quer que você esteja.
shortcuts-search = Pesquisar comandos e teclas
shortcuts-command = Comando
shortcuts-in-app = No aplicativo
shortcuts-global = Em qualquer lugar
shortcuts-window-only = Somente no aplicativo
shortcuts-no-matches = Nenhum comando corresponde.
shortcuts-listening = Pressione uma tecla para { $command }, ou Esc para cancelar
shortcuts-listening-short = Pressione uma tecla…
shortcuts-rebind = Alterar a atribuição de { $command }
shortcuts-clear = Limpar a atribuição de { $command }
shortcuts-conflict = Também atribuída a { $others }
shortcuts-not-registered = Outro programa está usando esta tecla ({ $reason })
shortcuts-wayland = O Wayland não permite que aplicativos reservem teclas em todo o sistema, portanto as atribuições «Em qualquer lugar» podem não funcionar nesta sessão.
shortcuts-reset = Restaurar padrões
shortcuts-cancel = Cancelar
shortcuts-apply = Aplicar
cmd-play-pause = Reproduzir / pausar
cmd-stop = Parar
cmd-top = Voltar ao início
cmd-faster = Acelerar
cmd-slower = Desacelerar
cmd-step-back = Recuar um passo
cmd-step-forward = Avançar um passo
cmd-next-marker = Próxima seção
cmd-prev-marker = Seção anterior
cmd-find = Localizar e substituir

## Section markers (FT-M05)
marker-list = Ir para uma seção
marker-previous = Seção anterior
marker-next = Próxima seção
marker-none-yet = Antes do primeiro marcador

## Script statistics (FT-M03)
stats-counts = { $words } palavras, { $chars } caracteres
stats-long-line = A linha { $line } está muito longa ({ $chars } caracteres)
