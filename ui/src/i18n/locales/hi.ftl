# Freally Teleprompt — हिन्दी (Hindi).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = स्क्रिप्ट
toolbar-projector = प्रोजेक्टर खोलें
toolbar-settings = सेटिंग्स
toolbar-bug-report = समस्या की रिपोर्ट करें
toolbar-updates = अपडेट जाँचें

## Transport
transport-play = चलाएँ
transport-pause = रोकें
transport-stop = रोकें
transport-restart = शुरुआत पर लौटें
transport-rewind = पीछे जाएँ
transport-forward = आगे जाएँ
transport-slower = धीमा
transport-faster = तेज़
transport-seek = स्क्रिप्ट में आगे-पीछे जाएँ

## Editor
editor-label = स्क्रिप्ट
editor-placeholder = अपनी स्क्रिप्ट टाइप करें या पेस्ट करें। ठहराव के लिए " -- " का उपयोग करें, या 2 सेकंड रुकने के लिए " --2 " का।
editor-unsaved = असहेजी स्क्रिप्ट
editor-caesura-hint = रुकने के लिए -- टाइप करें
editor-est-time = पढ़ने का समय { $time }
editor-preview = पूर्वावलोकन
editor-speed = गति (अक्षर प्रति सेकंड)
editor-speed-bpm = गति (BPM)
editor-bpm-mode = BPM मोड (गायन)
editor-read-aloud = प्रति-OS वाक् संश्लेषण से ज़ोर से पढ़ें
editor-save-failed = सहेजा नहीं जा सका: { $error }

## Script library
library-title = स्क्रिप्ट
library-new = नई
library-new-placeholder = नई स्क्रिप्ट का नाम
library-empty = अभी कोई स्क्रिप्ट नहीं है। शुरू करने के लिए ऊपर नाम दें।
library-open = खोलें
library-current = खुली है
library-rename = नाम बदलें
library-save-name = सहेजें
library-delete = हटाएँ
library-delete-confirm = हटाएँ?
library-delete-yes = हाँ
library-delete-no = नहीं
library-close = बंद करें

## Projector
projector-title = प्रोजेक्टर खोलें
projector-display = डिस्प्ले
projector-windowed = तैरती हुई विंडो (यह स्क्रीन)
projector-display-option = डिस्प्ले { $n } — { $w }×{ $h }
projector-primary = (प्राथमिक)
projector-fill = पूरी स्क्रीन भरें
projector-mirror = क्षैतिज रूप से दर्पण करें (बीम-स्प्लिटर काँच के लिए)
projector-mirror-hint = इसे तभी चालू करें जब प्रॉम्प्टर काँच से पढ़ा जा रहा हो — वह छवि उलट देता है।
projector-open = खोलें
projector-cancel = रद्द करें
projector-exit-hint = बाहर निकलने के लिए Esc दबाएँ
projector-window-title = Freally Teleprompt — प्रोजेक्टर

## Prompter surface
teleprompter-empty = अभी कोई स्क्रिप्ट लोड नहीं है। स्क्रिप्ट से कोई खोलें, या बाईं ओर लिखना शुरू करें।

## Settings
settings-title = सेटिंग्स
settings-language = भाषा
settings-language-auto = मेरे सिस्टम जैसी
settings-theme = थीम
settings-theme-dark = गहरा
settings-theme-light = हल्का
settings-section-reading = पठन
settings-speed = पढ़ने की गति — { $value } वर्ण प्रति सेकंड
settings-font-size = फ़ॉन्ट आकार — { $value } px
settings-caesura = " -- " के लिए डिफ़ॉल्ट ठहराव — { $value } सेकंड
settings-countdown = शुरू होने से पहले काउंटडाउन — { $value } सेकंड
settings-section-appearance = रूप
settings-font-family = टाइपफ़ेस
settings-font-system = सिस्टम
settings-font-sans = सैन्स-सेरिफ़
settings-font-serif = सेरिफ़
settings-font-mono = मोनोस्पेस
settings-font-rounded = गोलाकार
settings-font-slab = स्लैब
settings-font-weight = मोटाई
settings-text-color = पाठ का रंग
settings-line-height = पंक्ति अंतराल — { $value }
settings-margins = किनारों का मार्जिन — { $value }%
settings-guide = पठन रेखा — ऊपर से { $value }%
settings-section-projector = प्रोजेक्टर
settings-mirror = प्रोजेक्टर की छवि दर्पण करें (बीम-स्प्लिटर ग्लास के लिए)
settings-section-mirror = मेरे नेटवर्क पर मिरर करें
settings-lan-enabled = मेरे नेटवर्क के उपकरणों पर स्क्रिप्ट मिरर करें
settings-lan-all-interfaces = सिर्फ़ इस कंप्यूटर ही नहीं, दूसरे उपकरणों को भी अनुमति दें
settings-lan-warning = लिंक में एक-बार की कुंजी होती है और वह एन्क्रिप्टेड नहीं है, इसलिए इसे केवल भरोसेमंद नेटवर्क पर उपयोग करें। मिरर केवल-पढ़ने के लिए है और आपकी स्क्रिप्ट कहीं अपलोड नहीं होती।
settings-lan-port = पोर्ट
settings-lan-open = मेरे ब्राउज़र में खोलें
settings-lan-open-hint = कोड स्कैन करें, या इस लिंक को उसी नेटवर्क के किसी उपकरण पर खोलें।
settings-lan-failed = मिरर शुरू नहीं हो सका: { $error }
mirror-qr-aria = मिरर लिंक का QR कोड
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
updates-checking = अपडेट जाँचे जा रहे हैं…

## Startup
startup-failed = Freally Teleprompt शुरू नहीं हो सका।
