# Freally Teleprompt — Tiếng Việt (Vietnamese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Cài đặt
toolbar-bug-report = Báo cáo sự cố
toolbar-updates = Kiểm tra bản cập nhật

## Transport
transport-play = Phát
transport-pause = Tạm dừng
transport-restart = Về đầu

## Editor
editor-label = Kịch bản
editor-placeholder = Nhập hoặc dán kịch bản của bạn. Dùng " -- " để tạo một khoảng dừng, hoặc " --2 " để dừng 2 giây.
editor-load = Nạp vào máy nhắc chữ

## Prompter surface
teleprompter-empty = Chưa nạp kịch bản nào. Hãy soạn một kịch bản ở bên trái, rồi chọn "Nạp vào máy nhắc chữ".

## Settings
settings-title = Cài đặt
settings-language = Ngôn ngữ
settings-language-auto = Giống hệ thống của tôi
settings-theme = Chủ đề
settings-theme-dark = Tối
settings-theme-light = Sáng
settings-speed = Tốc độ đọc — { $value } ký tự mỗi giây
settings-font-size = Cỡ chữ — { $value } px
settings-caesura = Khoảng dừng mặc định cho " -- " — { $value } giây
settings-countdown = Đếm ngược trước khi bắt đầu — { $value } giây
settings-mirror = Lật gương hình chiếu (dùng cho kính tách tia)
settings-cancel = Hủy
settings-apply = Áp dụng

## First-run agreement
eula-title = Thỏa thuận Cấp phép Người dùng cuối
eula-version = Phiên bản { $version }
eula-intro = Vui lòng đọc thỏa thuận này. Bạn phải chấp nhận trước khi dùng Freally Teleprompt.
eula-scroll-hint = Cuộn tới cuối để tiếp tục.
eula-thanks = Cảm ơn bạn đã đọc.
eula-agree = Tôi Đồng ý
eula-decline = Từ chối & Thoát

## Problem report
bug-title = Báo cáo sự cố
bug-intro = Không có gì được gửi tự động. Bạn chọn cách gửi, và có thể đọc trước toàn bộ nội dung ngay bên dưới.
bug-crash-attached = Lần trước Freally Teleprompt đã dừng đột ngột. Chi tiết được đính kèm bên dưới.
bug-what-happened = Chuyện gì đã xảy ra?
bug-what-happened-placeholder = Bạn đang làm gì khi sự cố xảy ra?
bug-preview-label = Chính xác những gì sẽ được gửi
bug-open-github = Mở issue GitHub
bug-compose-gmail = Soạn trong Gmail
bug-send-email = Gửi qua email
bug-copy = Sao chép báo cáo
bug-copied = Đã sao chép
bug-dismiss-crash = Bỏ qua sự cố
bug-close = Đóng

## Updates
updates-title = Đã có bản cập nhật
updates-available = Đã có Freally Teleprompt { $version }. Bạn đang dùng { $current }.
updates-notes-label = Có gì mới
updates-yes = Có, cập nhật ngay
updates-no = Không, để sau
updates-installing = Đang tải xuống và cài đặt…
updates-none = Bạn đang dùng phiên bản mới nhất.
updates-error = Không thể kiểm tra bản cập nhật.
updates-checking = Đang kiểm tra bản cập nhật…

## Startup
startup-failed = Không thể khởi động Freally Teleprompt.
