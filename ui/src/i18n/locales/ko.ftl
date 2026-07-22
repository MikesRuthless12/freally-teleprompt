# Freally Teleprompt — 한국어 (Korean).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = 설정
toolbar-bug-report = 문제 신고
toolbar-updates = 업데이트 확인

## Transport
transport-play = 재생
transport-pause = 일시정지
transport-restart = 맨 위로

## Editor
editor-label = 대본
editor-placeholder = 대본을 입력하거나 붙여넣으세요. " -- "를 넣으면 잠시 멈추고, " --2 "를 넣으면 2초 동안 멈춥니다.
editor-load = 프롬프터에 불러오기

## Prompter surface
teleprompter-empty = 아직 불러온 대본이 없습니다. 왼쪽에 입력한 다음 "프롬프터에 불러오기"를 선택하세요.

## Settings
settings-title = 설정
settings-language = 언어
settings-language-auto = 시스템과 동일
settings-theme = 테마
settings-theme-dark = 어둡게
settings-theme-light = 밝게
settings-speed = 읽기 속도: 초당 { $value }자
settings-font-size = 글꼴 크기: { $value } px
settings-caesura = " -- "의 기본 멈춤: { $value }초
settings-countdown = 시작 전 카운트다운: { $value }초
settings-mirror = 프로젝터 화면 좌우 반전 (빔 스플리터 유리용)
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
