# Freally Teleprompt — العربية (Arabic).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = النصوص
toolbar-projector = فتح جهاز العرض
toolbar-settings = الإعدادات
toolbar-about = حول
toolbar-bug-report = الإبلاغ عن مشكلة
toolbar-updates = التحقق من التحديثات

## Window controls (the app draws its own title bar)
window-minimize = تصغير
window-maximize = تكبير
window-restore = استعادة
window-close = إغلاق

## System tray
tray-show = إظهار Freally Teleprompt
tray-quit = إنهاء

## About
about-version = الإصدار { $version }
about-tagline = ملقّن نصوص يعمل محليًا لصنّاع المحتوى والمحاضرين والمؤدّين. محرّك واحد قائم على الأحرف يُبقي المعاينة وجهاز العرض والمزامنة الشبكية على الكلمة نفسها.
about-privacy = بلا ذكاء اصطناعي، وبلا حساب، وبلا تتبّع. تبقى نصوصك على جهازك.
about-copyright = © 2026 Mike Weaver — Havoc Software. جميع الحقوق محفوظة.
about-website = الموقع
about-source = الشيفرة المصدرية
about-close = إغلاق

## Transport
transport-play = تشغيل
transport-pause = إيقاف مؤقت
transport-stop = إيقاف
transport-restart = العودة إلى البداية
transport-rewind = خطوة للخلف
transport-forward = خطوة للأمام
transport-slower = أبطأ
transport-faster = أسرع
transport-seek = التنقل داخل النص

## Editor
editor-label = النص
editor-placeholder = اكتب نصك أو الصقه هنا. استخدم " -- " لإضافة وقفة، أو " --2 " للتوقف مدة ثانيتين.
editor-caesura-hint = اكتب -- لإضافة وقفة
editor-est-time = زمن القراءة { $time }
editor-speed = السرعة (حرف في الثانية)
editor-speed-bpm = السرعة (BPM)
editor-bpm-mode = وضع BPM (غناء)
editor-read-aloud = القراءة بصوت عالٍ باستخدام تركيب الكلام الخاص بنظام التشغيل
editor-save-failed = تعذّر الحفظ: { $error }

## Script library
library-title = النصوص
library-new = جديد
library-new-placeholder = سمِّ نصًا جديدًا
library-empty = لا توجد نصوص بعد. سمِّ واحدًا في الأعلى للبدء.
library-open = فتح
library-current = مفتوح
library-rename = إعادة تسمية
library-save-name = حفظ
library-delete = حذف
library-delete-confirm = هل تريد حذفه؟
library-delete-yes = نعم
library-delete-no = لا
library-close = إغلاق

## Projector
projector-title = فتح جهاز العرض
projector-display = الشاشة
projector-windowed = نافذة عائمة (هذه الشاشة)
projector-display-option = الشاشة { $n } — { $w }×{ $h }
projector-primary = (رئيسية)
projector-fill = ملء الشاشة بالكامل
projector-mirror = عكس أفقيًا (لزجاج مقسّم الأشعة)
projector-mirror-hint = فعِّل هذا فقط إذا كانت القراءة عبر زجاج التلقين، فهو يعكس الصورة.
projector-open = فتح
projector-cancel = إلغاء
projector-exit-hint = اضغط Esc للخروج
projector-window-title = Freally Teleprompt — جهاز العرض

## Prompter surface
teleprompter-empty = لم يُحمَّل أي نص بعد. افتح واحدًا من «النصوص» أو ابدأ الكتابة على اليسار.

## Settings
settings-title = الإعدادات
settings-search-placeholder = بحث في الإعدادات…
settings-search-none = لا توجد إعدادات مطابقة.
settings-changed = تغيّر منذ الفتح
settings-ok = موافق
settings-cat-general = عام
settings-cat-editor = المحرر
settings-cat-reading = القراءة
settings-cat-appearance = المظهر
settings-cat-projector = جهاز العرض
settings-cat-network = الشبكة
settings-language = اللغة
settings-language-auto = مثل نظامي
settings-theme = السمة
settings-theme-dark = داكن
settings-theme-light = فاتح
settings-window-section = النافذة
settings-minimize-to-tray = التصغير إلى شريط النظام
settings-minimize-to-tray-note = يُخفي زر التصغير النافذة بدل إرسالها إلى شريط المهام. انقر أيقونة شريط النظام لإعادتها. لا توجد الأيقونة إلا ما دامت النافذة مخفية، وتختفي بمجرد استعادتها.
settings-autocomplete-section = الإكمال التلقائي
settings-autocomplete = اقتراح الكلمات أثناء الكتابة
settings-autocomplete-note = يظهر النص المقترح باهتًا أمام المؤشر. اضغط Tab لقبوله أو Esc لتجاهله. تأتي الاقتراحات من قوائم كلمات داخل التطبيق — لا يُرسل أي شيء تكتبه إلى أي مكان.
settings-autocomplete-language = لغة الاقتراحات
settings-autocomplete-language-auto = نفس لغة التطبيق
settings-lan-off-hint = المزامنة مُعطّلة. فعِّلها ثم اضغط «تطبيق» للحصول على رابط ورمز QR.
settings-section-reading = القراءة
settings-speed = سرعة القراءة — { $value } حرفًا في الثانية
settings-font-size = حجم الخط — { $value } بكسل
settings-caesura = الوقفة الافتراضية لـ " -- " — { $value } ثانية
settings-countdown = العد التنازلي قبل البدء — { $value } ثانية
settings-section-appearance = المظهر
settings-font-family = الخط
settings-font-system = خط النظام
settings-font-sans = بدون زخارف
settings-font-serif = بزخارف
settings-font-mono = ثابت العرض
settings-font-rounded = مستدير
settings-font-slab = عريض الزخارف
settings-font-weight = سماكة الخط
settings-text-color = لون النص
settings-line-height = تباعد الأسطر — { $value }
settings-margins = الهوامش الجانبية — { $value } ٪
settings-guide = خط القراءة — { $value } ٪ من الأعلى
settings-section-projector = جهاز العرض
settings-mirror = عكس صورة العارض (لزجاج مقسّم الأشعة)
settings-section-mirror = المزامنة عبر شبكتي
settings-lan-enabled = مزامنة النص مع الأجهزة على شبكتي
settings-lan-all-interfaces = السماح لأجهزة أخرى، وليس هذا الحاسوب فقط
settings-lan-warning = يحمل الرابط مفتاحًا لمرة واحدة وهو غير مشفَّر، لذا استخدمه فقط على شبكة تثق بها. المزامنة للقراءة فقط، ولا يُرفع نصك إلى أي مكان.
settings-lan-port = المنفذ
settings-lan-open = فتح في المتصفح
settings-lan-open-hint = امسح الرمز، أو افتح هذا الرابط على أي جهاز في الشبكة نفسها.
settings-lan-failed = تعذّر بدء المزامنة: { $error }
mirror-qr-aria = رمز QR لرابط المزامنة
settings-cancel = إلغاء
settings-apply = تطبيق

## First-run agreement
eula-title = اتفاقية ترخيص المستخدم النهائي
eula-version = الإصدار { $version }
eula-intro = يُرجى قراءة هذه الاتفاقية. عليك قبولها قبل استخدام Freally Teleprompt.
eula-scroll-hint = مرّر إلى النهاية للمتابعة.
eula-thanks = شكرًا لقراءتك.
eula-agree = أوافق
eula-decline = رفض وخروج

## Problem report
bug-title = الإبلاغ عن مشكلة
bug-intro = لا يُرسَل أي شيء تلقائيًا. أنت تختار طريقة الإرسال، ويمكنك قراءة النص كاملًا أدناه أولًا.
bug-crash-attached = توقّف Freally Teleprompt بشكل غير متوقع في المرة السابقة. التفاصيل مرفقة أدناه.
bug-what-happened = ماذا حدث؟
bug-what-happened-placeholder = ماذا كنت تفعل عندما حدثت المشكلة؟
bug-preview-label = ما سيُرسَل بالضبط
bug-open-github = فتح مشكلة على GitHub
bug-compose-gmail = إنشاء رسالة في Gmail
bug-send-email = الإرسال بالبريد الإلكتروني
bug-copy = نسخ التقرير
bug-copied = تم النسخ
bug-dismiss-crash = تجاهل التعطّل
bug-close = إغلاق

## Updates
updates-title = يتوفر تحديث
updates-available = يتوفر الإصدار { $version } من Freally Teleprompt. لديك الإصدار { $current }.
updates-notes-label = الجديد في هذا الإصدار
updates-yes = نعم، حدّث الآن
updates-no = لا، ليس الآن
updates-installing = جارٍ التنزيل والتثبيت…
updates-none = أنت على أحدث إصدار.
updates-error = تعذّر التحقق من التحديثات.
updates-checking = جارٍ البحث عن تحديثات…

## Startup
startup-failed = تعذّر تشغيل Freally Teleprompt.
