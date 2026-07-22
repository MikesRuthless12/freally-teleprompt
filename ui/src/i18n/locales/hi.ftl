# Freally Teleprompt — हिन्दी (Hindi).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = सेटिंग्स
toolbar-bug-report = समस्या की रिपोर्ट करें
toolbar-updates = अपडेट जाँचें

## Transport
transport-play = चलाएँ
transport-pause = रोकें
transport-restart = शुरुआत पर लौटें

## Editor
editor-label = स्क्रिप्ट
editor-placeholder = अपनी स्क्रिप्ट टाइप करें या पेस्ट करें। ठहराव के लिए " -- " का उपयोग करें, या 2 सेकंड रुकने के लिए " --2 " का।
editor-load = प्रॉम्प्टर में लोड करें

## Prompter surface
teleprompter-empty = अभी कोई स्क्रिप्ट लोड नहीं हुई है। बाईं ओर एक लिखें, फिर "प्रॉम्प्टर में लोड करें" चुनें।

## Settings
settings-title = सेटिंग्स
settings-language = भाषा
settings-language-auto = मेरे सिस्टम जैसी
settings-theme = थीम
settings-theme-dark = गहरा
settings-theme-light = हल्का
settings-speed = पढ़ने की गति — { $value } वर्ण प्रति सेकंड
settings-font-size = फ़ॉन्ट आकार — { $value } px
settings-caesura = " -- " के लिए डिफ़ॉल्ट ठहराव — { $value } सेकंड
settings-countdown = शुरू होने से पहले काउंटडाउन — { $value } सेकंड
settings-mirror = प्रोजेक्टर की छवि दर्पण करें (बीम-स्प्लिटर ग्लास के लिए)
settings-cancel = रद्द करें
settings-apply = लागू करें

## First-run agreement
eula-title = अंतिम उपयोगकर्ता लाइसेंस अनुबंध
eula-version = संस्करण { $version }
eula-intro = कृपया यह अनुबंध पढ़ें। Freally Teleprompt का उपयोग करने से पहले आपको इसे स्वीकार करना होगा।
eula-scroll-hint = जारी रखने के लिए अंत तक स्क्रॉल करें।
eula-thanks = पढ़ने के लिए धन्यवाद।
eula-agree = मैं सहमत हूँ
eula-decline = अस्वीकार करें और बाहर निकलें

## Problem report
bug-title = समस्या की रिपोर्ट करें
bug-intro = कुछ भी अपने आप नहीं भेजा जाता। भेजने का तरीका आप चुनते हैं, और नीचे दिया गया पूरा पाठ आप पहले पढ़ सकते हैं।
bug-crash-attached = पिछली बार Freally Teleprompt अचानक बंद हो गया था। विवरण नीचे संलग्न है।
bug-what-happened = क्या हुआ था?
bug-what-happened-placeholder = जब समस्या हुई तब आप क्या कर रहे थे?
bug-preview-label = बिल्कुल वही जो भेजा जाएगा
bug-open-github = GitHub पर issue खोलें
bug-compose-gmail = Gmail में लिखें
bug-send-email = ईमेल से भेजें
bug-copy = रिपोर्ट कॉपी करें
bug-copied = कॉपी हो गई
bug-dismiss-crash = क्रैश खारिज करें
bug-close = बंद करें

## Updates
updates-title = अपडेट उपलब्ध है
updates-available = Freally Teleprompt { $version } उपलब्ध है। आपके पास { $current } है।
updates-notes-label = नया क्या है
updates-yes = हाँ, अभी अपडेट करें
updates-no = नहीं, अभी नहीं
updates-installing = डाउनलोड और इंस्टॉल हो रहा है…
updates-none = आप नवीनतम संस्करण पर हैं।
updates-error = अपडेट की जाँच नहीं हो सकी।
