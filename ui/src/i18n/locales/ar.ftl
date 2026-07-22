# Freally Teleprompt — العربية (Arabic).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = الإعدادات
toolbar-bug-report = الإبلاغ عن مشكلة
toolbar-updates = التحقق من التحديثات

## Transport
transport-play = تشغيل
transport-pause = إيقاف مؤقت
transport-restart = العودة إلى البداية

## Editor
editor-label = النص
editor-placeholder = اكتب نصك أو الصقه هنا. استخدم " -- " لإضافة وقفة، أو " --2 " للتوقف مدة ثانيتين.
editor-load = تحميل إلى الملقّن

## Prompter surface
teleprompter-empty = لم يتم تحميل أي نص بعد. اكتب نصًا على اليمين، ثم اختر "تحميل إلى الملقّن".

## Settings
settings-title = الإعدادات
settings-language = اللغة
settings-language-auto = مثل نظامي
settings-theme = السمة
settings-theme-dark = داكن
settings-theme-light = فاتح
settings-speed = سرعة القراءة — { $value } حرفًا في الثانية
settings-font-size = حجم الخط — { $value } بكسل
settings-caesura = الوقفة الافتراضية لـ " -- " — { $value } ثانية
settings-countdown = العد التنازلي قبل البدء — { $value } ثانية
settings-mirror = عكس صورة العارض (لزجاج مقسّم الأشعة)
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
