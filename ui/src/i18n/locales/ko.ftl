# Freally Teleprompt — 한국어 (Korean).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = 대본
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
about-copyright = © 2026 Mike Weaver — Havoc Software. All rights reserved.
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
settings-voice-enabled = 음성으로 프롬프터 제어
settings-voice-note = 명령은 이 기기에서 실행되며 본인 목소리의 짧은 녹음과 대조됩니다. 모델도 네트워크도 없습니다 — 마이크는 듣는 동안에만 열리며, 말한 내용은 파일에 저장되지 않습니다.
settings-voice-mode = 들을 시점
settings-voice-mode-ptt = 버튼을 누르고 있는 동안에만
settings-voice-mode-always = 사용하는 동안 항상
settings-voice-commands = 내 명령
settings-voice-commands-note = 각 명령을 본인 목소리로 두세 번 녹음하세요. 녹음이 많을수록 더 안정적입니다.
settings-voice-record = 녹음
settings-voice-recording = 듣는 중…
settings-voice-forget = 삭제
settings-voice-takes = { $count }개 녹음됨
settings-voice-untrained = 녹음 안 됨
voice-cmd-next = 다음 일시정지
voice-listening = 듣는 중
voice-hold-to-talk = 누른 채로 말하기
