# Freally Teleprompt — Bahasa Indonesia (Indonesian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Naskah
toolbar-projector = Buka proyektor
toolbar-settings = Pengaturan
toolbar-about = Tentang
toolbar-bug-report = Laporkan masalah
toolbar-updates = Periksa pembaruan

## Window controls (the app draws its own title bar)
window-minimize = Perkecil
window-maximize = Perbesar
window-restore = Pulihkan
window-close = Tutup

## System tray
tray-show = Tampilkan Freally Teleprompt
tray-quit = Keluar

## About
about-version = Versi { $version }
about-tagline = Teleprompter lokal untuk kreator, pembicara, dan penampil. Satu mesin berbasis karakter menjaga pratinjau, proyektor, dan cermin jaringan tetap pada kata yang sama.
about-privacy = Tanpa AI, tanpa akun, tanpa telemetri. Naskah Anda tetap di perangkat Anda.
about-copyright = © 2026 Mike Weaver — Havoc Software. Hak cipta dilindungi.
about-website = Situs web
about-source = Kode sumber
about-close = Tutup

## Transport
transport-play = Putar
transport-pause = Jeda
transport-stop = Berhenti
transport-restart = Kembali ke awal
transport-rewind = Mundur
transport-forward = Maju
transport-slower = Lebih lambat
transport-faster = Lebih cepat
transport-seek = Telusuri naskah

## Editor
editor-label = Naskah
editor-placeholder = Ketik atau tempel naskah Anda. Gunakan " -- " untuk jeda, atau " --2 " untuk berhenti 2 detik.
editor-caesura-hint = Ketik -- untuk jeda
editor-est-time = Waktu baca { $time }
editor-speed = Kecepatan (karakter per detik)
editor-speed-bpm = Kecepatan (BPM)
editor-bpm-mode = Mode BPM (menyanyi)
editor-read-aloud = Bacakan dengan sintesis ucapan bawaan OS
editor-save-failed = Tidak bisa menyimpan: { $error }

## Script library
library-title = Naskah
library-new = Baru
library-new-placeholder = Beri nama naskah baru
library-empty = Belum ada naskah. Beri nama di atas untuk mulai.
library-open = Buka
library-current = terbuka
library-rename = Ganti nama
library-save-name = Simpan
library-delete = Hapus
library-delete-confirm = Hapus?
library-delete-yes = Ya
library-delete-no = Tidak
library-close = Tutup

## Projector
projector-title = Buka proyektor
projector-display = Layar
projector-windowed = Jendela mengambang (layar ini)
projector-display-option = Layar { $n } — { $w }×{ $h }
projector-primary = (utama)
projector-fill = Penuhi seluruh layar
projector-mirror = Cermin horizontal (untuk kaca beam-splitter)
projector-mirror-hint = Aktifkan hanya jika naskah dibaca lewat kaca prompter, yang membalik gambar.
projector-open = Buka
projector-cancel = Batal
projector-exit-hint = Tekan Esc untuk keluar
projector-window-title = Freally Teleprompt — proyektor

## Prompter surface
teleprompter-empty = Belum ada naskah dimuat. Buka satu dari Naskah, atau mulai mengetik di kiri.

## Settings
settings-title = Pengaturan
settings-search-placeholder = Cari pengaturan…
settings-search-none = Tidak ada pengaturan yang cocok.
settings-changed = Berubah sejak dibuka
settings-ok = OK
settings-cat-general = Umum
settings-cat-editor = Editor
settings-cat-reading = Membaca
settings-cat-appearance = Tampilan
settings-cat-projector = Proyektor
settings-cat-network = Jaringan
settings-language = Bahasa
settings-language-auto = Sama seperti sistem saya
settings-theme = Tema
settings-theme-dark = Gelap
settings-theme-light = Terang
settings-window-section = Jendela
settings-minimize-to-tray = Perkecil ke baki sistem
settings-minimize-to-tray-note = Tombol perkecil menyembunyikan jendela alih-alih mengirimnya ke bilah tugas. Klik ikon baki sistem untuk memunculkannya kembali. Ikon hanya ada selama jendela tersembunyi — memulihkannya menghilangkan ikon itu lagi.
settings-autocomplete-section = Pelengkapan otomatis
settings-autocomplete = Sarankan kata saat saya mengetik
settings-autocomplete-note = Teks yang disarankan tampil redup di depan kursor. Tekan Tab untuk menerimanya, atau Esc untuk menutupnya. Saran berasal dari daftar kata di dalam aplikasi — tidak ada yang Anda tulis dikirim ke mana pun.
settings-autocomplete-language = Bahasa saran
settings-autocomplete-language-auto = Sama dengan bahasa aplikasi
settings-lan-off-hint = Cermin mati. Nyalakan lalu tekan Terapkan untuk mendapat tautan dan kode QR.
settings-section-reading = Membaca
settings-speed = Kecepatan baca — { $value } karakter per detik
settings-font-size = Ukuran font — { $value } px
settings-caesura = Jeda bawaan untuk " -- " — { $value } detik
settings-countdown = Hitung mundur sebelum mulai — { $value } detik
settings-section-appearance = Tampilan
settings-font-family = Jenis huruf
settings-font-system = Sistem
settings-font-sans = Tanpa kait
settings-font-serif = Berkait
settings-font-mono = Lebar tetap
settings-font-rounded = Membulat
settings-font-slab = Slab
settings-font-weight = Ketebalan
settings-text-color = Warna teks
settings-line-height = Jarak baris — { $value }
settings-margins = Margin samping — { $value } %
settings-guide = Garis baca — { $value } % dari atas
settings-section-projector = Proyektor
settings-mirror = Cerminkan tampilan proyektor (untuk kaca beam splitter)
settings-section-mirror = Cerminkan ke jaringan saya
settings-lan-enabled = Cerminkan naskah ke perangkat di jaringan saya
settings-lan-all-interfaces = Izinkan perangkat lain, bukan hanya komputer ini
settings-lan-warning = Tautan membawa kunci sekali pakai dan tidak terenkripsi, jadi gunakan hanya di jaringan yang Anda percaya. Cermin bersifat baca-saja dan naskah Anda tidak pernah diunggah ke mana pun.
settings-lan-port = Port
settings-lan-open = Buka di peramban saya
settings-lan-open-hint = Pindai kode, atau buka tautan ini di perangkat mana pun di jaringan yang sama.
settings-lan-failed = Cermin tidak bisa dijalankan: { $error }
mirror-qr-aria = Kode QR untuk tautan cermin
settings-cancel = Batal
settings-apply = Terapkan

## First-run agreement
eula-title = Perjanjian Lisensi Pengguna Akhir
eula-version = Versi { $version }
eula-intro = Harap baca perjanjian ini. Anda harus menyetujuinya sebelum memakai Freally Teleprompt.
eula-scroll-hint = Gulir ke akhir untuk melanjutkan.
eula-thanks = Terima kasih telah membaca.
eula-agree = Saya Setuju
eula-decline = Tolak & Keluar

## Problem report
bug-title = Laporkan masalah
bug-intro = Tidak ada yang dikirim secara otomatis. Anda yang memilih cara mengirimnya, dan Anda bisa membaca dulu teks lengkapnya di bawah.
bug-crash-attached = Freally Teleprompt berhenti tiba-tiba pada sesi sebelumnya. Rinciannya dilampirkan di bawah.
bug-what-happened = Apa yang terjadi?
bug-what-happened-placeholder = Apa yang sedang Anda lakukan saat masalah muncul?
bug-preview-label = Persis apa yang akan dikirim
bug-open-github = Buka isu GitHub
bug-compose-gmail = Tulis di Gmail
bug-send-email = Kirim lewat email
bug-copy = Salin laporan
bug-copied = Tersalin
bug-dismiss-crash = Abaikan crash
bug-close = Tutup

## Updates
updates-title = Pembaruan tersedia
updates-available = Freally Teleprompt { $version } sudah tersedia. Anda memakai { $current }.
updates-notes-label = Yang baru
updates-yes = Ya, perbarui sekarang
updates-no = Tidak, nanti saja
updates-installing = Mengunduh dan memasang…
updates-none = Anda memakai versi terbaru.
updates-error = Tidak dapat memeriksa pembaruan.
updates-checking = Memeriksa pembaruan…

## Startup
startup-failed = Freally Teleprompt tidak dapat dijalankan.
