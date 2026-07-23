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
toolbar-about = Giới thiệu
toolbar-bug-report = Báo cáo sự cố
toolbar-updates = Kiểm tra bản cập nhật

## Window controls (the app draws its own title bar)
window-minimize = Thu nhỏ
window-maximize = Phóng to
window-restore = Khôi phục
window-close = Đóng

## System tray
tray-show = Hiện Freally Teleprompt
tray-quit = Thoát

## About
about-version = Phiên bản { $version }
about-tagline = Máy nhắc chữ chạy cục bộ cho người sáng tạo, diễn giả và người biểu diễn. Một bộ máy dựa trên ký tự giữ cho bản xem trước, màn hình chiếu và bản phản chiếu qua mạng cùng ở một từ.
about-privacy = Không AI, không tài khoản, không thu thập dữ liệu. Kịch bản của bạn ở lại trên máy bạn.
about-copyright = © 2026 Mike Weaver — Havoc Software. Bảo lưu mọi quyền.
about-website = Trang web
about-source = Mã nguồn
about-close = Đóng

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
editor-caesura-hint = Nhập -- để tạm dừng
editor-est-time = Thời gian đọc { $time }
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
settings-search-placeholder = Tìm cài đặt…
settings-search-none = Không có cài đặt phù hợp.
settings-changed = Đã thay đổi kể từ khi mở
settings-ok = OK
settings-cat-general = Chung
settings-cat-editor = Trình soạn thảo
settings-cat-reading = Đọc
settings-cat-appearance = Giao diện
settings-cat-projector = Màn hình chiếu
settings-cat-network = Mạng
settings-language = Ngôn ngữ
settings-language-auto = Giống hệ thống của tôi
settings-theme = Chủ đề
settings-theme-dark = Tối
settings-theme-light = Sáng
settings-window-section = Cửa sổ
settings-minimize-to-tray = Thu nhỏ xuống khay hệ thống
settings-minimize-to-tray-note = Nút thu nhỏ sẽ ẩn cửa sổ thay vì đưa xuống thanh tác vụ. Bấm biểu tượng ở khay hệ thống để mở lại. Biểu tượng chỉ tồn tại khi cửa sổ đang ẩn — khôi phục cửa sổ thì biểu tượng cũng mất.
settings-autocomplete-section = Tự động hoàn thành
settings-autocomplete = Gợi ý từ khi tôi gõ
settings-autocomplete-note = Văn bản gợi ý hiện mờ phía trước con trỏ. Nhấn Tab để chấp nhận hoặc Esc để bỏ qua. Gợi ý đến từ danh sách từ có sẵn trong ứng dụng — không có gì bạn viết được gửi đi đâu cả.
settings-autocomplete-language = Ngôn ngữ gợi ý
settings-autocomplete-language-auto = Giống ngôn ngữ ứng dụng
settings-lan-off-hint = Bản phản chiếu đang tắt. Bật lên rồi bấm Áp dụng để nhận liên kết và mã QR.
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

## Voice control (FT-31)
settings-cat-voice = Giọng nói
settings-voice-enabled = Điều khiển máy nhắc chữ bằng giọng nói của tôi
settings-voice-note = Các lệnh chạy trên thiết bị này và được đối chiếu với các bản ghi ngắn giọng nói của chính bạn. Không có mô hình và không có mạng — micrô chỉ bật khi đang lắng nghe, và không có gì bạn nói được lưu vào tệp.
settings-voice-mode = Khi nào lắng nghe
settings-voice-mode-ptt = Chỉ khi tôi giữ nút
settings-voice-mode-always = Luôn luôn, khi được bật
settings-voice-commands = Lệnh của bạn
settings-voice-commands-note = Ghi âm mỗi lệnh bằng giọng nói của chính bạn hai hoặc ba lần. Càng nhiều bản ghi thì càng ổn định.
settings-voice-record = Ghi âm
settings-voice-recording = Đang nghe…
settings-voice-forget = Quên
settings-voice-takes = Đã ghi { $count }
settings-voice-untrained = Chưa ghi
voice-cmd-next = Chỗ dừng tiếp theo
voice-listening = Đang nghe
voice-hold-to-talk = Giữ để nói
