# Freally Teleprompt — Türkçe (Turkish).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = Ayarlar
toolbar-bug-report = Sorun bildir
toolbar-updates = Güncellemeleri denetle

## Transport
transport-play = Oynat
transport-pause = Duraklat
transport-restart = Başa dön

## Editor
editor-label = Metin
editor-placeholder = Metninizi yazın veya yapıştırın. Duraklama için " -- ", 2 saniye beklemek için " --2 " kullanın.
editor-load = Prompter'a yükle

## Prompter surface
teleprompter-empty = Henüz metin yüklenmedi. Soldan bir metin yazın, sonra "Prompter'a yükle" seçeneğini kullanın.

## Settings
settings-title = Ayarlar
settings-language = Dil
settings-language-auto = Sistemimle aynı
settings-theme = Tema
settings-theme-dark = Koyu
settings-theme-light = Açık
settings-speed = Okuma hızı — saniyede { $value } karakter
settings-font-size = Yazı boyutu — { $value } px
settings-caesura = " -- " için varsayılan duraklama — { $value } saniye
settings-countdown = Başlamadan önce geri sayım — { $value } saniye
settings-mirror = Yansıtılan görüntüyü aynala (ışın ayırıcı cam için)
settings-cancel = İptal
settings-apply = Uygula

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
