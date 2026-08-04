# Freally Teleprompt — Türkçe (Turkish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = Metinler
toolbar-projector = Projektörü aç
toolbar-settings = Ayarlar
toolbar-about = Hakkında
toolbar-bug-report = Sorun bildir
toolbar-updates = Güncellemeleri denetle

## Window controls (the app draws its own title bar)
window-minimize = Simge durumuna küçült
window-maximize = Ekranı kapla
window-restore = Geri yükle
window-close = Kapat

## System tray
tray-show = Freally Teleprompt'u göster
tray-quit = Çık

## About
about-version = Sürüm { $version }
about-tagline = İçerik üreticileri, sunucular ve sahne sanatçıları için yerel çalışan bir prompter. Tek bir karakter tabanlı motor; önizlemeyi, yansıtıcıyı ve ağ yansımasını aynı kelimede tutar.
about-privacy = Yapay zekâ yok, hesap yok, telemetri yok. Metinleriniz cihazınızda kalır.
about-copyright = © 2026 Mike Weaver. Tüm hakları saklıdır.
about-website = Web sitesi
about-source = Kaynak kodu
about-close = Kapat

## Transport
transport-play = Oynat
transport-pause = Duraklat
transport-stop = Durdur
transport-restart = Başa dön
transport-rewind = Geri
transport-forward = İleri
transport-slower = Daha yavaş
transport-faster = Daha hızlı
transport-seek = Metinde ilerle

## Editor
editor-label = Metin
editor-dictate = Dikte et
editor-dictate-stop = Diktesi durdur
editor-dictate-hint = Dikteye başlamak için kaydet düğmesine basın
editor-dictate-hint-stop = Dikteyi bitirmek için durdur düğmesine basın
editor-placeholder = Metninizi yazın veya yapıştırın. Duraklama için " -- ", 2 saniye beklemek için " --2 " kullanın.
editor-caesura-hint = Duraklama için -- yazın
editor-est-time = Okuma süresi { $time }
editor-speed = Hız (saniyedeki karakter)
editor-speed-bpm = Hız (BPM)
editor-bpm-mode = BPM modu (şarkı)
editor-read-aloud = İşletim sistemi konuşma sentezi ile sesli oku
editor-save-failed = Kaydedilemedi: { $error }

## Script library
library-title = Metinler
library-new = Yeni
library-new-placeholder = Yeni metne bir ad verin
library-empty = Henüz metin yok. Başlamak için yukarıda bir ad verin.
library-open = Aç
library-current = açık
library-rename = Yeniden adlandır
library-save-name = Kaydet
library-delete = Sil
library-delete-confirm = Silinsin mi?
library-delete-yes = Evet
library-delete-no = Hayır
library-close = Kapat

## Projector
projector-title = Yansıtıcıyı aç
projector-display = Ekran
projector-windowed = Yüzen pencere (bu ekran)
projector-display-option = Ekran { $n } — { $w }×{ $h }
projector-primary = (birincil)
projector-fill = Ekranın tamamını kapla
projector-mirror = Yatay olarak aynala (ışın bölücü cam için)
projector-mirror-hint = Yalnızca prompter camından okunuyorsa açın; o cam görüntüyü ters çevirir.
projector-open = Aç
projector-cancel = İptal
projector-exit-hint = Çıkmak için Esc'e basın
projector-window-title = Freally Teleprompt — yansıtıcı

## Prompter surface
teleprompter-empty = Henüz metin yüklenmedi. Metinler'den birini açın ya da solda yazmaya başlayın.

## Settings
settings-title = Ayarlar
settings-search-placeholder = Ayarlarda ara…
settings-search-none = Eşleşen ayar yok.
settings-changed = Açıldığından beri değişti
settings-ok = Tamam
settings-cat-general = Genel
settings-cat-editor = Düzenleyici
settings-cat-reading = Okuma
settings-cat-appearance = Görünüm
settings-cat-projector = Yansıtıcı
settings-cat-network = Ağ
settings-language = Dil
settings-language-auto = Sistemimle aynı
settings-theme = Tema
settings-theme-system = Sistemimle aynı
settings-theme-dark = Koyu
settings-theme-light = Açık
settings-window-section = Pencere
settings-minimize-to-tray = Sistem tepsisine küçült
settings-minimize-to-tray-note = Küçült düğmesi pencereyi görev çubuğuna göndermek yerine gizler. Geri getirmek için tepsi simgesine tıklayın. Simge yalnızca pencere gizliyken vardır; pencereyi geri getirdiğinizde kaybolur.
settings-autocomplete-section = Otomatik tamamlama
settings-autocomplete = Yazarken kelime öner
settings-autocomplete-note = Önerilen metin imlecin önünde soluk görünür. Kabul etmek için Tab, kapatmak için Esc tuşuna basın. Öneriler uygulamanın içindeki kelime listelerinden gelir — yazdıklarınız hiçbir yere gönderilmez.
settings-autocomplete-language = Öneri dili
settings-autocomplete-language-auto = Uygulama diliyle aynı
settings-lan-off-hint = Yansıtma kapalı. Bağlantı ve QR kodu almak için açıp Uygula'ya basın.
settings-section-reading = Okuma
settings-speed = Okuma hızı — saniyede { $value } karakter
settings-font-size = Yazı boyutu — { $value } px
settings-caesura = " -- " için varsayılan duraklama — { $value } saniye
settings-countdown = Başlamadan önce geri sayım — { $value } saniye
settings-section-appearance = Görünüm
settings-font-family = Yazı tipi
settings-font-system = Sistem
settings-font-sans = Tırnaksız
settings-font-serif = Tırnaklı
settings-font-mono = Eş aralıklı
settings-font-rounded = Yuvarlatılmış
settings-font-slab = Slab
settings-font-weight = Kalınlık
settings-text-color = Metin rengi
settings-line-height = Satır aralığı — { $value }
settings-margins = Yan boşluklar — %{ $value }
settings-guide = Okuma çizgisi — yukarıdan %{ $value }
settings-section-projector = Yansıtıcı
settings-mirror = Yansıtılan görüntüyü aynala (ışın ayırıcı cam için)
settings-section-mirror = Ağıma yansıt
settings-lan-enabled = Metni ağımdaki cihazlara yansıt
settings-lan-all-interfaces = Yalnızca bu bilgisayara değil, diğer cihazlara da izin ver
settings-lan-warning = Bağlantı tek kullanımlık bir anahtar taşır ve şifreli değildir; yalnızca güvendiğiniz bir ağda kullanın. Yansıtma salt okunurdur ve metniniz hiçbir yere yüklenmez.
settings-lan-port = Bağlantı noktası
settings-lan-open = Tarayıcımda aç
settings-lan-open-hint = Kodu okutun ya da bu bağlantıyı aynı ağdaki bir cihazda açın.
settings-lan-failed = Yansıtma başlatılamadı: { $error }
mirror-qr-aria = Yansıtma bağlantısının QR kodu
settings-cancel = İptal
settings-apply = Uygula

## Onboarding tour (FT-50)
tour-step = { $total } adımdan { $n }
tour-skip = Atla
tour-back = Geri
tour-next = İleri
tour-done = Yazmaya başla
tour-welcome-title = Freally Teleprompt'a hoş geldiniz
tour-welcome-body = Tümüyle kendi bilgisayarınızda çalışan bir suflör. Hesap yok, bulut yok, yapay zekâ yok, abonelik yok. Bu yaklaşık bir dakika sürer — istediğiniz an Atla'ya basın, turu ayarlardan yeniden başlatabilirsiniz.
tour-write-title = Metninizi yazın
tour-write-body = Solda yazın ya da yapıştırın. Birden fazlasını saklamak için Metinler'i açın; yazdıkça her şey kaydedilir. İki kısa çizgi, tutmak istediğiniz bir duraklamayı işaretler; imlecin önündeki soluk öneriler de uzun sözcükleri sizin için tamamlar.
tour-read-title = Temponuzu belirleyin
tour-read-body = Hız gerçek bir okuma temposudur — saniyedeki karakter sayısı — ya da bir ritim üzerine rap yapıyor veya şarkı söylüyorsanız BPM'e geçin. Oynat, duraklat ve geri sar düzenleyicinin altındadır; ya da önizlemede herhangi bir sözcüğe tıklayıp oradan başlayın. Yanan sözcük her zaman okuma çizgisinin üzerinde durur.
tour-show-title = Okuyan kişiye gösterin
tour-show-body = Yansıtıcı, metni ikinci bir ekrana taşır; içinden okuyorsanız yarı geçirgen cam için aynalar ya da kendi ağınızdaki bir telefona yansıtır. Geri kalan her şey — yazı tipi, renk, kenar boşlukları, dil, tema — başlık çubuğundaki dişli simgesinin arkasındadır.
settings-tour-section = Başlarken
settings-tour-replay = Turu yeniden göster
settings-tour-replay-note = Düzenleyici, tempo denetimleri ve yansıtıcı hakkındaki dört adımlık tanıtımı yeniden çalıştırır. Neyi anlattığını görebilmeniz için ayarlar önce kapatılır.

## First-run agreement
eula-title = Son Kullanıcı Lisans Sözleşmesi
eula-version = Sürüm { $version }
eula-intro = Lütfen bu sözleşmeyi okuyun. Freally Teleprompt uygulamasını kullanmadan önce kabul etmeniz gerekir.
eula-scroll-hint = Devam etmek için sona kaydırın.
eula-thanks = Okuduğunuz için teşekkürler.
eula-agree = Kabul Ediyorum
eula-decline = Reddet ve Çık

## Problem report
bug-title = Sorun bildir
bug-intro = Hiçbir şey otomatik olarak gönderilmez. Nasıl göndereceğinize siz karar verirsiniz ve gönderilecek metnin tamamını aşağıda önceden okuyabilirsiniz.
bug-crash-attached = Freally Teleprompt geçen sefer beklenmedik şekilde kapandı. Ayrıntılar aşağıda eklidir.
bug-what-happened = Ne oldu?
bug-what-happened-placeholder = Sorun ortaya çıktığında ne yapıyordunuz?
bug-preview-label = Tam olarak ne gönderilecek
bug-open-github = GitHub'da konu aç
bug-compose-gmail = Gmail'de oluştur
bug-send-email = E-postayla gönder
bug-copy = Raporu kopyala
bug-copied = Kopyalandı
bug-dismiss-crash = Çökmeyi kapat
bug-close = Kapat

## Updates
updates-title = Güncelleme var
updates-available = Freally Teleprompt { $version } yayınlandı. Sizdeki sürüm { $current }.
updates-notes-label = Yenilikler
updates-yes = Evet, şimdi güncelle
updates-no = Hayır, şimdi değil
updates-installing = İndiriliyor ve kuruluyor…
updates-none = En son sürümü kullanıyorsunuz.
updates-error = Güncellemeler denetlenemedi.
updates-checking = Güncellemeler denetleniyor…

## Startup
startup-failed = Freally Teleprompt başlatılamadı.

## Voice control (FT-31)
settings-cat-voice = Ses
settings-dictation-enabled = Metnimi konuşarak yaz
settings-dictation-note = Metnin üzerindeki kayıt düğmesine basın; söyledikleriniz metne yazılır. Tanıma bu cihazda yapılır — hesap yok, ağ yok ve söyledikleriniz hiçbir dosyaya kaydedilmez. Mikrofon yalnızca kayıt sırasında açıktır. Metin ağınızdaki cihazlara yansıtılıyorsa, dikte edilen sözcükler yazıldıkları anda oraya da ulaşır — klavyeyle yazdığınız her şey gibi.
settings-dictation-unavailable-model = Konuşma modeli kurulu değil, bu yüzden dikte çalışamaz.
settings-dictation-unavailable-build = Bu sürümde dikte kullanılamıyor.

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = Ölçü { $bar } · { $beat }
tempo-count-in = Giriş sayımı { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = Prova yap ve okumamın süresini tut
pace-behind = { $time } gecikmeli
pace-ahead = { $time } önde
rehearsal-title = Prova raporu
rehearsal-empty = Henüz hiçbir şey ölçülmedi. Bunu açın, metni baştan sona oynatın, sonra kapatın.
rehearsal-col-section = Bölüm
rehearsal-col-planned = Planlanan
rehearsal-col-actual = Gerçekleşen
rehearsal-col-delta = Fark
rehearsal-unfinished = tamamlanmadı
rehearsal-suggest = Bunu yaklaşık saniyede { $to } karakterle okudunuz, { $from } değil.
rehearsal-suggest-apply = O hızı kullan
rehearsal-close = Kapat

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = Zamanlama
settings-tempo-section = Tempo
settings-metronome = Geçerli tempoda tık çal
settings-metronome-note = Metin akarken her vuruşta hafif bir tık, ölçünün ilk vuruşunda vurgulu. Başlangıç geri sayımı giriş sayımına dönüşür. Sesi uygulama kendi üretir — hiçbir şey indirilmez.
settings-beats-per-bar = Ölçüdeki vuruş sayısı
settings-calibration-section = Kendi tempon
settings-chars-per-beat = Vuruş başına { $value } karakter
settings-chars-per-beat-note = Bir tempo tek bir sayı üzerinden okuma hızına dönüşür: bir vuruşta kaç karakter geçtiğiniz. Sahnede kullandığınız tempoda vurun; sayı varsayılmak yerine okuma hızınıza göre ölçülür.
settings-tap-tempo = Vur
settings-tap-hint = En az üç kez vurun
settings-tap-bpm = Vurulan: { $bpm } BPM
settings-tap-apply = Bu tempoyu kullan
settings-tap-reset = Varsayılana dön
settings-skip-section = Seslendirmediğiniz sözcükler
settings-skip-words = Atlanacak sözcükler
settings-skip-words-note = Her satıra bir tane. Yalnızca bunlardan birinden oluşan bir satır — Nakarat, Kıta 1, Köprü — hiç zaman almaz, böylece sözleriniz onları yazdığınız ölçüde kalır. Aynı sözcük gerçek bir satırın içindeyse yalnızca kendisi atlanır. Ekranda soluk olarak kalırlar ve sesli okuma onları asla söylemez.
settings-skip-words-placeholder = Her satıra bir sözcük
