# Freally Teleprompt — Bahasa Indonesia (Indonesian).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Pengaturan
toolbar-bug-report = Laporkan masalah
toolbar-updates = Periksa pembaruan

## Transport
transport-play = Putar
transport-pause = Jeda
transport-restart = Kembali ke awal

## Editor
editor-label = Naskah
editor-placeholder = Ketik atau tempel naskah Anda. Gunakan " -- " untuk jeda, atau " --2 " untuk berhenti 2 detik.
editor-load = Muat ke prompter

## Prompter surface
teleprompter-empty = Belum ada naskah yang dimuat. Ketik satu di sebelah kiri, lalu pilih "Muat ke prompter".

## Settings
settings-title = Pengaturan
settings-language = Bahasa
settings-language-auto = Sama seperti sistem saya
settings-theme = Tema
settings-theme-dark = Gelap
settings-theme-light = Terang
settings-speed = Kecepatan baca — { $value } karakter per detik
settings-font-size = Ukuran font — { $value } px
settings-caesura = Jeda bawaan untuk " -- " — { $value } detik
settings-countdown = Hitung mundur sebelum mulai — { $value } detik
settings-mirror = Cerminkan tampilan proyektor (untuk kaca beam splitter)
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
