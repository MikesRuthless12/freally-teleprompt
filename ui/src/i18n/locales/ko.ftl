# Freally Teleprompt — 한국어 (Korean).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = 대본
toolbar-import = 가져오기
toolbar-find = 찾기
toolbar-projector = 프로젝터 열기
toolbar-settings = 설정
toolbar-about = 정보
toolbar-bug-report = 문제 신고
toolbar-updates = 업데이트 확인

## Window controls (the app draws its own title bar)
window-minimize = 최소화
window-maximize = 최대화
window-restore = 이전 크기로
window-close = 닫기

## System tray
tray-show = Freally Teleprompt 표시
tray-quit = 종료

## About
about-version = 버전 { $version }
about-tagline = 크리에이터와 발표자, 공연자를 위한 로컬 텔레프롬프터입니다. 하나의 문자 단위 엔진이 미리보기와 프로젝터, 네트워크 미러를 같은 단어에 맞춥니다.
about-privacy = AI도, 계정도, 원격 수집도 없습니다. 대본은 기기 안에만 남습니다.
about-copyright = © 2026 Mike Weaver. All rights reserved.
about-website = 웹사이트
about-source = 소스 코드
about-close = 닫기

## Transport
transport-play = 재생
transport-pause = 일시정지
transport-stop = 정지
transport-restart = 맨 위로
transport-rewind = 뒤로
transport-forward = 앞으로
transport-slower = 느리게
transport-faster = 빠르게
transport-seek = 대본 탐색

## Editor
editor-label = 대본
editor-dictate = 받아쓰기
editor-dictate-stop = 받아쓰기 중지
editor-dictate-hint = 녹음을 누르면 받아쓰기가 시작됩니다
editor-dictate-hint-stop = 정지를 누르면 받아쓰기가 끝납니다
editor-placeholder = 대본을 입력하거나 붙여넣으세요. " -- "를 넣으면 잠시 멈추고, " --2 "를 넣으면 2초 동안 멈춥니다.
editor-caesura-hint = 일시정지하려면 -- 입력
editor-est-time = 읽는 시간 { $time }
editor-speed = 속도(초당 글자 수)
editor-speed-bpm = 속도 (BPM)
editor-bpm-mode = BPM 모드 (노래)
editor-read-aloud = OS 기본 음성 합성으로 읽어주기
editor-save-failed = 저장하지 못했습니다: { $error }

## Script library
library-title = 대본
library-new = 새로 만들기
library-new-placeholder = 새 대본의 이름
library-empty = 아직 대본이 없습니다. 위에 이름을 입력해 시작하세요.
library-open = 열기
library-current = 열림
library-rename = 이름 변경
library-save-name = 저장
library-delete = 삭제
library-delete-confirm = 삭제할까요?
library-delete-yes = 예
library-delete-no = 아니오
library-close = 닫기

## Projector
projector-title = 프로젝터 열기
projector-display = 디스플레이
projector-windowed = 떠 있는 창(이 화면)
projector-display-option = 디스플레이 { $n } — { $w }×{ $h }
projector-primary = (기본)
projector-fill = 화면 전체 채우기
projector-mirror = 좌우 반전(하프미러용)
projector-mirror-hint = 프롬프터 유리를 통해 읽을 때만 켜세요. 유리가 화면을 좌우로 뒤집습니다.
projector-open = 열기
projector-cancel = 취소
projector-exit-hint = 종료하려면 Esc를 누르세요
projector-window-title = Freally Teleprompt — 프로젝터

## Prompter surface
teleprompter-empty = 아직 불러온 대본이 없습니다. 대본에서 열거나 왼쪽에 입력해 보세요.

## Settings
settings-title = 설정
settings-search-placeholder = 설정 검색…
settings-search-none = 일치하는 설정이 없습니다.
settings-changed = 열람 후 변경됨
settings-ok = 확인
settings-cat-general = 일반
settings-cat-editor = 편집기
settings-cat-reading = 읽기
settings-cat-appearance = 모양
settings-cat-projector = 프로젝터
settings-cat-network = 네트워크
settings-language = 언어
settings-language-auto = 시스템과 동일
settings-theme = 테마
settings-theme-system = 시스템과 동일
settings-theme-dark = 어둡게
settings-theme-light = 밝게
settings-window-section = 창
settings-minimize-to-tray = 시스템 트레이로 최소화
settings-minimize-to-tray-note = 최소화 단추가 창을 작업 표시줄로 보내지 않고 숨깁니다. 트레이 아이콘을 클릭하면 다시 나타납니다. 아이콘은 창이 숨겨져 있는 동안에만 존재하며, 창을 되돌리면 사라집니다.
settings-autocomplete-section = 자동 완성
settings-autocomplete = 입력할 때 단어 제안
settings-autocomplete-note = 제안된 텍스트는 커서 앞에 흐리게 표시됩니다. Tab 키로 적용하고 Esc 키로 취소합니다. 제안은 앱에 포함된 단어 목록에서 가져오며, 작성한 내용은 어디로도 전송되지 않습니다.
settings-autocomplete-language = 제안 언어
settings-autocomplete-language-auto = 앱 언어와 동일
settings-lan-off-hint = 미러가 꺼져 있습니다. 켠 뒤 적용을 누르면 링크와 QR 코드가 나타납니다.
settings-section-reading = 읽기
settings-speed = 읽기 속도: 초당 { $value }자
settings-font-size = 글꼴 크기: { $value } px
settings-caesura = " -- "의 기본 멈춤: { $value }초
settings-countdown = 시작 전 카운트다운: { $value }초
settings-section-appearance = 모양
settings-font-family = 글꼴
settings-font-system = 시스템
settings-font-sans = 산세리프
settings-font-serif = 세리프
settings-font-mono = 고정폭
settings-font-rounded = 둥근 글꼴
settings-font-slab = 슬랩 세리프
settings-font-weight = 굵기
settings-text-color = 글자 색
settings-line-height = 줄 간격 — { $value }
settings-margins = 좌우 여백 — { $value } %
settings-guide = 읽기 안내선 — 위에서 { $value } %
settings-section-projector = 프로젝터
settings-mirror = 프로젝터 화면 좌우 반전 (빔 스플리터 유리용)
settings-section-mirror = 내 네트워크로 미러링
settings-lan-enabled = 같은 네트워크의 기기에 대본 미러링
settings-lan-all-interfaces = 이 컴퓨터뿐 아니라 다른 기기도 허용
settings-lan-warning = 링크에는 일회용 키가 들어 있고 암호화되지 않습니다. 신뢰하는 네트워크에서만 사용하세요. 미러는 읽기 전용이며 대본은 어디에도 업로드되지 않습니다.
settings-lan-port = 포트
settings-lan-open = 브라우저에서 열기
settings-lan-open-hint = 코드를 스캔하거나 같은 네트워크의 기기에서 이 링크를 여세요.
settings-lan-failed = 미러를 시작하지 못했습니다: { $error }
mirror-qr-aria = 미러 링크 QR 코드
settings-cancel = 취소
settings-apply = 적용

## Onboarding tour (FT-50)
tour-step = { $total }단계 중 { $n }단계
tour-skip = 건너뛰기
tour-back = 이전
tour-next = 다음
tour-done = 대본 쓰기 시작
tour-welcome-title = Freally Teleprompt에 오신 것을 환영합니다
tour-welcome-body = 전적으로 내 컴퓨터 안에서만 도는 프롬프터입니다. 계정도, 클라우드도, AI도, 구독도 없습니다. 1분쯤 걸립니다. 언제든 건너뛸 수 있고, 설정에서 다시 볼 수도 있습니다.
tour-write-title = 대본을 쓰세요
tour-write-body = 왼쪽에 입력하거나 붙여 넣으세요. 여러 개를 두려면 대본을 여세요. 쓰는 동안 모두 저장됩니다. 붙임표 두 개는 붙잡고 싶은 쉼을 뜻하고, 커서 앞의 흐린 제안이 긴 낱말을 대신 완성해 줍니다.
tour-read-title = 속도를 정하세요
tour-read-body = 속도는 실제 읽기 속도, 곧 초당 글자 수입니다. 비트에 맞춰 랩을 하거나 노래한다면 BPM으로 바꾸세요. 재생, 일시정지, 되감기는 편집기 아래에 있고, 미리보기의 아무 낱말이나 눌러 거기서 시작할 수도 있습니다. 켜진 낱말은 언제나 읽기 선 위에 놓입니다.
tour-show-title = 읽는 사람에게 보여 주세요
tour-show-body = 프로젝터는 대본을 두 번째 화면으로 보냅니다. 반투명 거울 너머로 읽는다면 좌우를 뒤집을 수 있고, 같은 네트워크의 휴대폰으로 내보낼 수도 있습니다. 글꼴, 색, 여백, 언어, 테마 등 나머지는 모두 제목 표시줄의 톱니바퀴 안에 있습니다.
settings-tour-section = 시작하기
settings-tour-replay = 둘러보기 다시 보기
settings-tour-replay-note = 편집기, 속도 조절, 프로젝터에 대한 네 단계 안내를 다시 실행합니다. 무엇을 가리키는지 보이도록 설정을 먼저 닫습니다.

## First-run agreement
eula-title = 최종 사용자 사용권 계약
eula-version = 버전 { $version }
eula-intro = 이 계약을 읽어 주세요. Freally Teleprompt 사용을 시작하기 전에 동의해야 합니다.
eula-scroll-hint = 계속하려면 끝까지 스크롤하세요.
eula-thanks = 읽어주셔서 감사합니다.
eula-agree = 동의합니다
eula-decline = 거부하고 종료

## Problem report
bug-title = 문제 신고
bug-intro = 자동으로 전송되는 내용은 없습니다. 보내는 방법은 직접 고르며, 보낼 내용을 아래에서 그대로 미리 읽어볼 수 있습니다.
bug-crash-attached = 지난번에 Freally Teleprompt가 예기치 않게 종료되었습니다. 자세한 내용은 아래에 첨부했습니다.
bug-what-happened = 무슨 일이 있었나요?
bug-what-happened-placeholder = 문제가 생겼을 때 무엇을 하고 있었나요?
bug-preview-label = 전송될 정확한 내용
bug-open-github = GitHub 이슈 열기
bug-compose-gmail = Gmail에서 작성
bug-send-email = 이메일 보내기
bug-copy = 신고 내용 복사
bug-copied = 복사됨
bug-dismiss-crash = 크래시 닫기
bug-close = 닫기

## Updates
updates-title = 업데이트 있음
updates-available = Freally Teleprompt { $version } 버전이 나왔습니다. 현재 버전은 { $current }입니다.
updates-notes-label = 새로워진 점
updates-yes = 예, 지금 업데이트
updates-no = 아니요, 나중에
updates-installing = 내려받아 설치하는 중…
updates-none = 최신 버전입니다.
updates-error = 업데이트를 확인할 수 없습니다.
updates-checking = 업데이트를 확인하는 중…

## Startup
startup-failed = Freally Teleprompt를 시작할 수 없습니다.

## Voice control (FT-31)
settings-cat-voice = 음성
settings-dictation-enabled = 말해서 대본 쓰기
settings-dictation-note = 대본 위의 녹음 버튼을 누르면 말한 내용이 그대로 입력됩니다. 인식은 이 기기에서 이루어지며 계정도 네트워크도 필요 없고, 말한 내용이 파일로 저장되지 않습니다. 마이크는 녹음 중에만 열립니다.대본을 같은 네트워크의 기기에 미러링 중이라면, 받아쓴 단어도 입력되는 즉시 그 기기에 전달됩니다. 직접 타이핑한 내용과 똑같습니다.
settings-dictation-unavailable-model = 음성 모델이 설치되지 않아 받아쓰기를 실행할 수 없습니다.
settings-dictation-unavailable-build = 이 빌드에서는 받아쓰기를 사용할 수 없습니다.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = { $bar }마디 · { $beat }박
tempo-count-in = 카운트인 { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = 리허설하고 내 낭독 시간을 재기
pace-behind = { $time } 늦음
pace-ahead = { $time } 빠름
rehearsal-title = 리허설 결과
rehearsal-empty = 아직 측정된 것이 없습니다. 이 기능을 켜고 대본을 끝까지 재생한 다음 다시 끄세요.
rehearsal-col-section = 구간
rehearsal-col-planned = 예정
rehearsal-col-actual = 실제
rehearsal-col-delta = 차이
rehearsal-unfinished = 미완료
rehearsal-suggest = 실제로는 초당 약 { $to }자로 읽었습니다. { $from }자가 아닙니다.
rehearsal-suggest-apply = 그 속도 사용
rehearsal-close = 닫기

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = 타이밍
settings-tempo-section = 템포
settings-metronome = 현재 템포로 클릭음 재생
settings-metronome-note = 대본이 흐르는 동안 매 박마다 조용한 틱 소리가 나고, 마디의 첫 박에 강세가 붙습니다. 시작 카운트다운이 그대로 카운트인이 됩니다. 소리는 앱이 직접 만들며, 내려받는 것은 없습니다.
settings-beats-per-bar = 한 마디의 박 수
settings-calibration-section = 나만의 템포
settings-chars-per-beat = 한 박에 { $value }자
settings-chars-per-beat-note = 템포는 숫자 하나로 읽기 속도가 됩니다. 한 박에 몇 글자를 지나는가입니다. 공연하는 템포로 두드리면 추정하지 않고 당신의 읽기 속도에서 측정합니다.
settings-tap-tempo = 두드리기
settings-tap-hint = 세 번 이상 두드리세요
settings-tap-bpm = 측정됨: { $bpm } BPM
settings-tap-apply = 이 템포 사용
settings-tap-reset = 기본값으로 되돌리기
settings-skip-section = 부르지 않는 낱말
settings-skip-words = 건너뛸 낱말
settings-skip-words-note = 한 줄에 하나씩. 그 낱말만 있는 줄 — 후렴, 1절, 브리지 — 은 시간을 전혀 쓰지 않으므로 가사가 쓴 그대로의 마디에 남습니다. 실제 줄 안에 있는 같은 낱말은 그 낱말만 건너뜁니다. 화면에는 흐리게 남아 있고, 소리내어 읽기는 절대 발음하지 않습니다.
settings-skip-words-placeholder = 한 줄에 한 낱말

## Document import (FT-M01)
import-title = 문서 가져오기
import-choose = 문서 선택...
import-hint = Word, RTF, PDF, 일반 텍스트 또는 Markdown.
import-filter = 문서
import-reading = 문서를 읽는 중...
import-format-txt = 일반 텍스트
import-format-markdown = Markdown
import-format-docx = Word 문서
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = { $format }을(를) 읽었습니다: { $paragraphs }개 문단, { $chars }자.
import-flattened = 굵게, 기울임, 글꼴, 색은 프롬프터용 일반 텍스트로 단순화했습니다.
import-truncated = 문서가 대본 한도보다 길어 잘렸습니다.
import-nothing-dropped = 그 밖에 빠진 것은 없습니다.
import-drop-encoding = 파일이 유니코드로 저장되어 있지 않아 서유럽 텍스트로 읽었습니다.
import-drop-images = 제외한 그림: { $count }
import-drop-footnotes = 제외한 각주: { $count }
import-drop-comments = 제외한 메모: { $count }
import-drop-headersFooters = 제외한 머리글과 바닥글: { $count }
import-drop-linkTargets = 제외한 링크 주소(글자는 그대로): { $count }
import-drop-objects = 제외한 포함 개체: { $count }
import-preview = 프롬프터 텍스트
import-name = 다른 이름으로 저장
import-confirm = 가져오기
import-cancel = 취소

## Find and replace (FT-M07)
find-title = 찾기 및 바꾸기
find-what = 찾기
find-with = 바꿀 내용
find-case = 대소문자 구분
find-whole-word = 온전한 단어만
find-count = { $total } 중 { $at }
find-none = 일치 항목 없음
find-replaced = { $count }개를 바꿨습니다
find-previous = 이전
find-next = 다음
find-replace = 바꾸기
find-replace-all = 모두 바꾸기
find-close = 닫기

## Section markers (FT-M05)
marker-list = 구간으로 이동
marker-previous = 이전 구간
marker-next = 다음 구간
marker-none-yet = 첫 표시 앞

## Script statistics (FT-M03)
stats-counts = { $words }단어, { $chars }자
stats-long-line = { $line }번째 줄이 매우 깁니다({ $chars }자)
