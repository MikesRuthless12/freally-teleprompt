# Freally Teleprompt — Tiếng Việt (Vietnamese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Kịch bản
toolbar-projector = Mở máy chiếu
toolbar-settings = Cài đặt
toolbar-bug-report = Báo cáo sự cố
toolbar-updates = Kiểm tra bản cập nhật

## Transport
transport-play = Phát
transport-pause = Tạm dừng
transport-stop = Dừng
transport-restart = Về đầu
transport-rewind = Lùi lại
transport-forward = Tiến tới
transport-slower = Chậm hơn
transport-faster = Nhanh hơn
transport-seek = Di chuyển trong kịch bản

## Editor
editor-label = Kịch bản
editor-placeholder = Nhập hoặc dán kịch bản của bạn. Dùng " -- " để tạo một khoảng dừng, hoặc " --2 " để dừng 2 giây.
editor-unsaved = Kịch bản chưa lưu
editor-caesura-hint = Nhập -- để tạm dừng
editor-est-time = Thời gian đọc { $time }
editor-preview = Xem trước
editor-speed = Tốc độ (ký tự mỗi giây)
editor-speed-bpm = Tốc độ (BPM)
editor-bpm-mode = Chế độ BPM (hát)
editor-read-aloud = Đọc to bằng bộ tổng hợp giọng nói của hệ điều hành
editor-save-failed = Không thể lưu: { $error }

## Script library
library-title = Kịch bản
library-new = Tạo mới
library-new-placeholder = Đặt tên cho kịch bản mới
library-empty = Chưa có kịch bản nào. Đặt tên ở trên để bắt đầu.
library-open = Mở
library-current = đang mở
library-rename = Đổi tên
library-save-name = Lưu
library-delete = Xoá
library-delete-confirm = Xoá chứ?
library-delete-yes = Có
library-delete-no = Không
library-close = Đóng

## Projector
projector-title = Mở màn hình chiếu
projector-display = Màn hình
projector-windowed = Cửa sổ nổi (màn hình này)
projector-display-option = Màn hình { $n } — { $w }×{ $h }
projector-primary = (chính)
projector-fill = Lấp đầy toàn màn hình
projector-mirror = Lật ngang (cho kính bán mạ)
projector-mirror-hint = Chỉ bật khi người đọc nhìn qua kính nhắc chữ, vì kính làm lật ngược hình.
projector-open = Mở
projector-cancel = Hủy
projector-exit-hint = Nhấn Esc để thoát
projector-window-title = Freally Teleprompt — màn hình chiếu

## Prompter surface
teleprompter-empty = Chưa nạp kịch bản nào. Mở một kịch bản trong Kịch bản, hoặc bắt đầu gõ ở bên trái.

## Settings
settings-title = Cài đặt
settings-language = Ngôn ngữ
settings-language-auto = Giống hệ thống của tôi
settings-theme = Chủ đề
settings-theme-dark = Tối
settings-theme-light = Sáng
settings-section-reading = Đọc
settings-speed = Tốc độ đọc — { $value } ký tự mỗi giây
settings-font-size = Cỡ chữ — { $value } px
settings-caesura = Khoảng dừng mặc định cho " -- " — { $value } giây
settings-countdown = Đếm ngược trước khi bắt đầu — { $value } giây
settings-section-appearance = Giao diện
settings-font-family = Kiểu chữ
settings-font-system = Của hệ thống
settings-font-sans = Không chân
settings-font-serif = Có chân
settings-font-mono = Đều nét
settings-font-rounded = Bo tròn
settings-font-slab = Chân khối
settings-font-weight = Độ đậm
settings-text-color = Màu chữ
settings-line-height = Giãn dòng — { $value }
settings-margins = Lề hai bên — { $value } %
settings-guide = Vạch đọc — { $value } % từ trên xuống
settings-section-projector = Màn hình chiếu
settings-mirror = Lật gương hình chiếu (dùng cho kính tách tia)
settings-section-mirror = Phản chiếu vào mạng của tôi
settings-lan-enabled = Phản chiếu kịch bản tới các thiết bị trong mạng của tôi
settings-lan-all-interfaces = Cho phép thiết bị khác, không chỉ máy tính này
settings-lan-warning = Liên kết mang một khoá dùng một lần và không được mã hoá, nên chỉ dùng trên mạng bạn tin tưởng. Bản phản chiếu chỉ để xem, và kịch bản của bạn không bao giờ được tải lên đâu cả.
settings-lan-port = Cổng
settings-lan-open = Mở trong trình duyệt
settings-lan-open-hint = Quét mã, hoặc mở liên kết này trên bất kỳ thiết bị nào cùng mạng.
settings-lan-failed = Không khởi động được bản phản chiếu: { $error }
mirror-qr-aria = Mã QR của liên kết phản chiếu
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
