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
toolbar-bug-report = 문제 신고
toolbar-updates = 업데이트 확인

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
editor-unsaved = 저장되지 않은 대본
editor-caesura-hint = 일시정지하려면 -- 입력
editor-est-time = 읽는 시간 { $time }
editor-preview = 미리보기
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
settings-language = 언어
settings-language-auto = 시스템과 동일
settings-theme = 테마
settings-theme-dark = 어둡게
settings-theme-light = 밝게
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
